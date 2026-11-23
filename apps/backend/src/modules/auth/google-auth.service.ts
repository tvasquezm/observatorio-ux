import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../core/database/prisma.service.js';
import { AuthService, CUENTA_SIN_ACCESO } from './auth.service.js';

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  get clientId(): string { return this.config.get<string>('GOOGLE_CLIENT_ID', '').trim(); }

  /** F35: dominios de Google Workspace aceptados (GOOGLE_ALLOWED_DOMAINS, separados por coma). Vacío = sin restricción extra. */
  get dominiosPermitidos(): string[] {
    return String(this.config.get<string>('GOOGLE_ALLOWED_DOMAINS') ?? '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  }

  async login(credential: string, nonce: unknown) {
    if (!this.clientId) throw new ServiceUnavailableException('El acceso con Google todavía no está configurado.');
    if (typeof nonce !== 'string' || nonce.length !== 64) throw new UnauthorizedException('La solicitud de acceso expiró. Recarga la página.');
    const payload = await this.client.verifyIdToken({ idToken: credential, audience: this.clientId })
      .then(ticket => ticket.getPayload()).catch(() => { throw new UnauthorizedException('No se pudo verificar el acceso con Google.'); });
    const tokenNonce = payload?.nonce;
    if (typeof tokenNonce !== 'string' || Buffer.byteLength(tokenNonce) !== Buffer.byteLength(nonce)
      || !timingSafeEqual(Buffer.from(tokenNonce), Buffer.from(nonce)) || !payload?.sub || !payload.email_verified || !payload.email) {
      throw new UnauthorizedException('La identidad de Google o la solicitud de acceso no son válidas.');
    }

    const email = payload.email.toLowerCase();
    const dominios = this.dominiosPermitidos;
    if (dominios.length && (!payload.hd || !dominios.includes(payload.hd.toLowerCase()) || !dominios.some(d => email.endsWith(`@${d}`)))) {
      throw new ForbiddenException(`Ingresa con tu cuenta institucional (${dominios.map(d => '@' + d).join(', ')}).`);
    }

    let user = await this.prisma.usuario.findUnique({ where: { googleSubject: payload.sub } });
    if (!user) {
      // Solo Google Workspace y Gmail permiten vincular por correo con autoridad de Google.
      if (!payload.hd && !payload.email.toLowerCase().endsWith('@gmail.com')) {
        throw new ForbiddenException('Utiliza una cuenta de Gmail o una cuenta institucional de Google Workspace.');
      }
      user = await this.prisma.usuario.findUnique({ where: { email } });
    }
    // F35 (D3): un estudiante cuyo correo está en la lista de una sala activa obtiene su cuenta al primer ingreso.
    // Cualquier otro correo desconocido no deja ningún dato guardado.
    if (!user && await this.auth.estudianteEnSalaActiva(email)) {
      user = await this.prisma.usuario.create({ data: { nombre: (payload.name ?? '').trim() || email, email, rol: 'ESTUDIANTE', googleSubject: payload.sub } })
        .catch(async () => this.prisma.usuario.findUnique({ where: { email } }));
    }
    if (!user || (user.googleSubject && user.googleSubject !== payload.sub)) {
      throw new ForbiddenException(CUENTA_SIN_ACCESO);
    }
    const session = await this.auth.createEvaluatorSession(user);
    if (!user.googleSubject) {
      const linked = await this.prisma.usuario.updateMany({ where: { id: user.id, googleSubject: null }, data: { googleSubject: payload.sub } })
        .catch(() => { throw new UnauthorizedException('No se pudo vincular esta identidad. Vuelve a intentarlo.'); });
      if (!linked.count) {
        const current = await this.prisma.usuario.findUnique({ where: { googleSubject: payload.sub } });
        if (current?.id !== user.id) throw new UnauthorizedException('La cuenta ya está vinculada a otra identidad.');
      }
    }
    return session;
  }
}
