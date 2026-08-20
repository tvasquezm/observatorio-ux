import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedUser } from './types/authenticated-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  /**
   * Autorregistro de un participante. Solo funciona si su email está en
   * la whitelist cargada por el docente/evaluador para ese proyecto.
   * Es idempotente: si la persona ya se había registrado, devuelve el
   * mismo participanteId en vez de fallar.
   */
  async registerParticipant(
    proyectoId: string,
    emailCrudo: string,
    nombre?: string,
  ) {
    const email = emailCrudo.trim().toLowerCase();

    const entry = await this.prisma.participanteWhitelist.findUnique({
      where: { proyectoId_email: { proyectoId, email } },
    });

    if (!entry) {
      throw new ForbiddenException(
        'Este email no está autorizado para participar en este proyecto. ' +
          'Pídele al docente que lo agregue a la lista.',
      );
    }

    if (entry.usado && entry.participanteId) {
      return { participanteId: entry.participanteId, yaRegistrado: true };
    }

    const participante = await this.prisma.participante.create({
      data: {
        metadata: nombre ? { nombre } : undefined,
      },
    });

    await this.prisma.participanteWhitelist.update({
      where: { id: entry.id },
      data: { usado: true, participanteId: participante.id },
    });

    return { participanteId: participante.id, yaRegistrado: false };
  }
  async login(email: string, password: string) {
    const user = await this.prisma.usuario.findUnique({ where: { email } });

    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const accessToken = await this.signEvaluatorToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
      actor: 'EVALUADOR',
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    };
  }

  async issueParticipantToken(participanteId: string, proyectoId: string) {
    const participante = await this.prisma.participante.findUnique({
      where: { id: participanteId },
    });

    if (!participante) {
      throw new NotFoundException('El participante no existe.');
    }

    const consentimiento = await this.prisma.consentimiento.findFirst({
      where: { participanteId, proyectoId, aceptado: true },
    });

    if (!consentimiento) {
      throw new ForbiddenException(
        'El participante no tiene consentimiento aceptado para este proyecto.',
      );
    }

    const accessToken = await this.jwt.signAsync({
      sub: participante.id,
      actor: 'PARTICIPANTE',
      rol: 'PARTICIPANTE',
      proyectoId,
    });

    return {
      access_token: accessToken,
      participant: { id: participante.id, proyectoId },
    };
  }

  async issueDevelopmentEvaluatorToken() {
    if (this.config.get('app.nodeEnv') === 'production') {
      throw new NotFoundException();
    }

    const user = await this.prisma.usuario.findFirst({
      where: { rol: { in: ['ESTUDIANTE', 'DOCENTE', 'ADMIN'] } },
      orderBy: { createdAt: 'asc' },
    });

    if (!user) {
      throw new NotFoundException(
        'No hay usuarios evaluadores. Ejecuta el seed antes de pedir un token de prueba.',
      );
    }

    return {
      access_token: await this.signEvaluatorToken({
        id: user.id,
        email: user.email,
        rol: user.rol,
        actor: 'EVALUADOR',
      }),
      user: { id: user.id, email: user.email, rol: user.rol },
    };
  }

  async issueDevelopmentParticipantToken() {
    if (this.config.get('app.nodeEnv') === 'production') {
      throw new NotFoundException();
    }

    const consent = await this.prisma.consentimiento.findFirst({
      where: { aceptado: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!consent) {
      throw new NotFoundException(
        'No hay participantes con consentimiento. Ejecuta el seed antes de pedir un token de prueba.',
      );
    }

    return this.issueParticipantToken(consent.participanteId, consent.proyectoId);
  }

  async validateTokenPayload(payload: {
    sub: string;
    email?: string;
    rol?: string;
    actor?: string;
    proyectoId?: string;
  }): Promise<AuthenticatedUser> {
    if (payload.actor === 'PARTICIPANTE') {
      const participant = await this.prisma.participante.findUnique({
        where: { id: payload.sub },
      });

      if (!participant) {
        throw new UnauthorizedException('El participante del token no existe.');
      }

      return {
        id: participant.id,
        rol: 'PARTICIPANTE',
        actor: 'PARTICIPANTE',
        proyectoId: payload.proyectoId,
      };
    }

    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('El usuario del token no existe.');
    }

    return {
      id: user.id,
      email: user.email,
      rol: user.rol,
      actor: 'EVALUADOR',
    };
  }

  private signEvaluatorToken(user: AuthenticatedUser) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      rol: user.rol,
      actor: 'EVALUADOR',
    });
  }
}
