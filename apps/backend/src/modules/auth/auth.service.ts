import {
  ConflictException,
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
import { ParticipanteJwtService } from './participante-jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly participanteJwt: ParticipanteJwtService,
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

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.participanteWhitelist.findUnique({
        where: { proyectoId_email: { proyectoId, email } },
      });

      if (!entry) {
        throw new ForbiddenException(
          'Este email no está autorizado para participar en este proyecto. ' +
            'Pídele al docente que lo agregue a la lista.',
        );
      }

      if (entry.participanteId) {
        return { participanteId: entry.participanteId, yaRegistrado: true };
      }

      const participante = await tx.participante.create({
        data: {
          metadata: nombre?.trim() ? { nombre: nombre.trim() } : undefined,
        },
      });

      // La condición evita que dos solicitudes concurrentes reclamen la misma
      // invitación. La segunda solicitud elimina su participante provisional y
      // devuelve el participante ganador.
      const claimed = await tx.participanteWhitelist.updateMany({
        where: { id: entry.id, participanteId: null },
        data: { usado: true, participanteId: participante.id },
      });

      if (claimed.count === 1) {
        return { participanteId: participante.id, yaRegistrado: false };
      }

      const currentEntry = await tx.participanteWhitelist.findUnique({
        where: { id: entry.id },
      });

      await tx.participante.delete({ where: { id: participante.id } });

      if (currentEntry?.participanteId) {
        return {
          participanteId: currentEntry.participanteId,
          yaRegistrado: true,
        };
      }

      throw new ConflictException(
        'No se pudo completar el registro. Inténtalo nuevamente.',
      );
    });
  }

  async registerParticipantConsent(
    participanteId: string,
    proyectoId: string,
    aceptado: boolean,
    version: string,
  ) {
    const participante = await this.prisma.participante.findUnique({
      where: { id: participanteId },
    });

    if (!participante) {
      throw new NotFoundException('El participante no existe.');
    }

    const whitelistEntry = await this.prisma.participanteWhitelist.findFirst({
      where: { proyectoId, participanteId, usado: true },
    });

    if (!whitelistEntry) {
      throw new ForbiddenException(
        'El participante no está autorizado para este proyecto.',
      );
    }

    const latestConsent = await this.prisma.consentimiento.findFirst({
      where: { participanteId, proyectoId },
      orderBy: { createdAt: 'desc' },
    });

    if (latestConsent) {
      return this.prisma.consentimiento.update({
        where: { id: latestConsent.id },
        data: { aceptado, version, createdAt: new Date() },
      });
    }

    return this.prisma.consentimiento.create({
      data: { participanteId, proyectoId, aceptado, version },
    });
  }
  /**
   * Login de EVALUADOR vía Google OAuth. Si el email no tiene Usuario
   * registrado, lo crea automáticamente con rol ESTUDIANTE.
   *
   * Reglas de negocio (no relajar sin aprobación explícita):
   * 1. Aislamiento por proyecto: el `create` de abajo NO debe tocar
   *    ninguna relación (proyectosCreados, proyectosMiembro, etc.). El
   *    usuario nuevo nace sin proyectos asociados — no ve ni edita nada
   *    hasta que un DOCENTE/ADMIN lo enrole explícitamente en un Proyecto.
   * 2. Sin auto-promoción de rol: el rol de un usuario nuevo por Google
   *    es SIEMPRE 'ESTUDIANTE', sin excepción ni heurística por dominio
   *    de email. Pasar a DOCENTE/ADMIN es un cambio manual en la BD (o
   *    desde el panel admin del Sprint 5) — este flujo nunca escribe el
   *    campo `rol` de un usuario ya existente.
   */
  async loginOrCreateFromGoogle(emailCrudo: string, nombreCrudo?: string) {
    const email = emailCrudo.trim().toLowerCase();

    let user = await this.prisma.usuario.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.usuario.create({
        data: {
          email,
          nombre: nombreCrudo?.trim() || email,
          rol: 'ESTUDIANTE',
          // Sin passwordHash: esta cuenta solo puede entrar por Google.
        },
      });
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

  async issueParticipantToken(
    participanteId: string,
    proyectoId: string,
    allowUnlisted = false,
  ) {
    const participante = await this.prisma.participante.findUnique({
      where: { id: participanteId },
    });

    if (!participante) {
      throw new NotFoundException('El participante no existe.');
    }

    if (!allowUnlisted) {
      const whitelistEntry = await this.prisma.participanteWhitelist.findFirst({
        where: { proyectoId, participanteId, usado: true },
      });

      if (!whitelistEntry) {
        throw new ForbiddenException(
          'El participante no está autorizado para este proyecto.',
        );
      }
    }

    const consentimiento = await this.prisma.consentimiento.findFirst({
      where: { participanteId, proyectoId },
      orderBy: { createdAt: 'desc' },
    });

    if (!consentimiento?.aceptado) {
      throw new ForbiddenException(
        'El participante no tiene consentimiento aceptado para este proyecto.',
      );
    }

    const accessToken = await this.participanteJwt.sign({
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

    return this.issueParticipantToken(
      consent.participanteId,
      consent.proyectoId,
      true,
    );
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

  /**
   * Perfil completo para GET /auth/me. `validateTokenPayload` (usado por
   * JwtStrategy) devuelve el `AuthenticatedUser` mínimo (sin `nombre`) que
   * necesitan los guards; acá se reconstruye la forma que espera el
   * frontend (`EvaluatorUser`: id, nombre, email, rol) a partir del id.
   */
  async getEvaluatorProfile(userId: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('El usuario del token no existe.');
    }
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
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
