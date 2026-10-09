import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { GoogleOauthGuard } from './google-oauth.guard.js';
import {
  LoginDto,
  ParticipantAccessDto,
  ParticipantTokenDto,
  RegisterParticipantDto,
  RegisterParticipantConsentDto,
} from './auth.dto.js';
import type { AuthenticatedUser } from './types/authenticated-user.interface.js';

// Los E2E recorren dos viewports y pueden repetir un caso fallido. Se evita
// que el propio runner se bloquee por IP sin relajar el límite de producción.
const LOGIN_RATE_LIMIT = process.env.NODE_ENV === 'test' ? 30 : 5;

// Cookie de sesión: sin `maxAge` (cookie de sesión de navegador). La
// expiración real la sigue marcando el JWT (`ignoreExpiration: false` en
// JwtStrategy) — no hace falta duplicar ese plazo acá y arriesgarse a que
// se desincronicen si cambia JWT_EXPIRES_IN.
function cookieOptions(nodeEnv: string, httpOnly: boolean) {
  return {
    httpOnly,
    sameSite: 'lax' as const,
    secure: nodeEnv === 'production',
    path: '/',
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // Compartido por login() y el callback de Google — mismas cookies
  // httpOnly (evaluadorToken/csrfToken), mismo mecanismo de sesión sin
  // importar el método de autenticación.
  private setSessionCookies(res: Response, accessToken: string) {
    const nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    const csrfToken = randomBytes(32).toString('hex');
    res.cookie('evaluadorToken', accessToken, cookieOptions(nodeEnv, true));
    res.cookie('csrfToken', csrfToken, cookieOptions(nodeEnv, false));
  }

  private frontendUrl(path = '/') {
    const origin = this.config
      .getOrThrow<string>('app.corsOrigin')
      .replace(/\/+$/, '');
    return `${origin}${path}`;
  }

  // Límite estricto: es el blanco más obvio de fuerza bruta (probar
  // contraseñas contra un email conocido). 5 intentos / minuto por IP,
  // contra el default global de 60/min del resto de la API.
  @Throttle({ default: { limit: LOGIN_RATE_LIMIT, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.login(
      dto.email,
      dto.password,
    );
    this.setSessionCookies(res, access_token);

    return { user };
  }

  // Login de EVALUADOR con Google (opcional, ver GOOGLE_* en env.example).
  // Paso 1: redirige al consentimiento de Google. GoogleOauthGuard arma la
  // URL; esta función nunca se ejecuta. Si Google no está configurado, el
  // guard vuelve a /login?error=google_no_disponible.
  @Get('google')
  @UseGuards(GoogleOauthGuard)
  googleAuth() {}

  // Paso 2: Google vuelve acá con el código; el guard ya resolvió el
  // intercambio y dejó {email, nombre} en req.user. Se emiten las mismas
  // cookies que el login por password y se redirige al frontend. Cualquier
  // rechazo de negocio vuelve a /login con un código, nunca JSON crudo.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = req.user as { email: string; nombre?: string };
    try {
      const { access_token } = await this.authService.loginOrCreateFromGoogle(
        profile.email,
        profile.nombre,
      );
      this.setSessionCookies(res, access_token);
      res.redirect(this.frontendUrl('/'));
    } catch (error) {
      const codigo =
        error instanceof ForbiddenException ? 'google_sin_acceso' : 'google_fallo';
      res.redirect(this.frontendUrl(`/login?error=${codigo}`));
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    res.clearCookie('evaluadorToken', cookieOptions(nodeEnv, true));
    res.clearCookie('csrfToken', cookieOptions(nodeEnv, false));
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getEvaluatorProfile(user.id).then((perfil) => ({
      user: perfil,
    }));
  }

  // Fase 1 (PLAN_AJUSTES.md): acceso público sin nombre/correo. Cualquiera
  // con el proyectoId (vía link/QR) entra directo — decisión de acceso
  // abierto, sin whitelist. El burst permite el ingreso simultáneo de una
  // sala completa que comparte la misma IP pública.
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('participants/access')
  accessParticipant(@Body() dto: ParticipantAccessDto) {
    return this.authService.accessParticipant(dto.proyectoId);
  }

  // Flujo previo con whitelist/email + código de invitación. Se mantiene
  // para el caso en que el docente sí quiera controlar quién participa
  // (ej. invitaciones de Evaluación Heurística vía projects.addToWhitelist);
  // ya no es el flujo por defecto de Card Sorting/onboarding público.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('participants/register')
  registerParticipant(@Body() dto: RegisterParticipantDto) {
    return this.authService.registerParticipant(
      dto.proyectoId,
      dto.email,
      dto.nombre,
      dto.codigoInvitacion,
    );
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('participants/consent')
  registerParticipantConsent(@Body() dto: RegisterParticipantConsentDto) {
    return this.authService.registerParticipantConsent(
      dto.participanteId,
      dto.proyectoId,
      dto.aceptado,
      dto.version,
      dto.codigoInvitacion,
      dto.resumeToken,
    );
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('participants/token')
  participantToken(@Body() dto: ParticipantTokenDto) {
    return this.authService.issueParticipantToken(
      dto.participanteId,
      dto.proyectoId,
      dto.codigoInvitacion,
      false,
      dto.resumeToken,
    );
  }

  @Get('test-token')
  getTestToken() {
    return this.authService.issueDevelopmentEvaluatorToken();
  }

  @Get('test-participant-token')
  getTestParticipantToken() {
    return this.authService.issueDevelopmentParticipantToken();
  }
}
