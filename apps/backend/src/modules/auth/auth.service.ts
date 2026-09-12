import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
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

  private assertInvitationCode(codigo: string, esperado?: string | null) {
    const recibido = createHash('sha256').update(codigo).digest();
    const esperadoBuffer = esperado ? Buffer.from(esperado, 'hex') : Buffer.alloc(recibido.length);
    if (!esperado || esperadoBuffer.length !== recibido.length || !timingSafeEqual(recibido, esperadoBuffer)) {
      throw new ForbiddenException('El código de invitación no es válido.');
    }
  }
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
    codigoInvitacion?: string,
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

      this.assertInvitationCode(codigoInvitacion ?? '', entry.codigoInvitacionHash);

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

  /**
   * Fase 1 (PLAN_AJUSTES.md): punto de acceso público sin datos
   * personales. Acceso 100% abierto por link/QR — decisión tomada por el
   * usuario para reemplazar el registro con whitelist/email. Cualquiera
   * con el proyectoId puede entrar: no valida whitelist ni código de
   * invitación. Crea un Participante sin metadata y devuelve el token de
   * sesión directo (mismo `participanteJwt` que `issueParticipantToken`).
   *
   * El consentimiento sigue siendo obligatorio, pero se exige más
   * adelante en el flujo (ver `CardSortingService.joinSession`), no acá
   * — así el participante puede navegar a la pantalla de consentimiento
   * ya con sesión, en vez de recibir el token recién después de aceptar.
   */
  async accessParticipant(proyectoId: string) {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
    });

    if (!proyecto || proyecto.deletedAt) {
      throw new NotFoundException('El proyecto no existe.');
    }

    const participante = await this.prisma.participante.create({ data: {} });

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

  async registerParticipantConsent(
    participanteId: string,
    proyectoId: string,
    aceptado: boolean,
    version: string,
    codigoInvitacion?: string,
  ) {
    const participante = await this.prisma.participante.findUnique({
      where: { id: participanteId },
    });

    if (!participante) {
      throw new NotFoundException('El participante no existe.');
    }

    const proyecto = await this.prisma.proyecto.findUnique({ where: { id: proyectoId } });
    if (!proyecto || proyecto.deletedAt) {
      throw new NotFoundException('El proyecto no existe.');
    }

    // Fase 1 (PLAN_AJUSTES.md): si el participante entró por el acceso
    // público abierto (accessParticipant), nunca existe una entrada de
    // whitelist a su nombre — no hay código que validar. Si sí existe
    // (flujo previo con invitación por email), se sigue exigiendo el
    // código, igual que antes.
    const whitelistEntry = await this.prisma.participanteWhitelist.findFirst({
      where: { proyectoId, participanteId, usado: true },
    });

    if (whitelistEntry) {
      this.assertInvitationCode(codigoInvitacion ?? '', whitelistEntry.codigoInvitacionHash);
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
    codigoInvitacion?: string,
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
      this.assertInvitationCode(codigoInvitacion ?? '', whitelistEntry.codigoInvitacionHash);
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
      undefined,
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
