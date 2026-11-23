import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import {
  LoginDto,
  GoogleLoginDto,
  ChangePasswordDto,
  ParticipantAccessDto,
  ParticipantTokenDto,
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
    private readonly google: GoogleAuthService,
  ) {}

  @Get('google/config')
  googleConfig(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const passwordLogin = this.authService.passwordLoginEnabled;
    if (!this.google.clientId) return { enabled: false as const, passwordLogin };
    const nonce = randomBytes(32).toString('hex');
    const nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    res.cookie('googleLoginNonce', nonce, { ...cookieOptions(nodeEnv, true), maxAge: 5 * 60_000 });
    return { enabled: true as const, clientId: this.google.clientId, nonce, passwordLogin };
  }

  @Post('google')
  @Throttle({ default: { limit: LOGIN_RATE_LIMIT, ttl: 60_000 } })
  async googleLogin(@Body() dto: GoogleLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { access_token, user } = await this.google.login(dto.credential, req.cookies?.googleLoginNonce);
    const nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    res.clearCookie('googleLoginNonce', cookieOptions(nodeEnv, true));
    res.cookie('evaluadorToken', access_token, cookieOptions(nodeEnv, true));
    res.cookie('csrfToken', randomBytes(32).toString('hex'), cookieOptions(nodeEnv, false));
    res.setHeader('Cache-Control', 'no-store');
    return { user };
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
    const { access_token, user, session } = await this.authService.login(
      dto.email,
      dto.password,
    );
    const nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    const csrfToken = randomBytes(32).toString('hex');

    res.cookie('evaluadorToken', access_token, cookieOptions(nodeEnv, true));
    res.cookie('csrfToken', csrfToken, cookieOptions(nodeEnv, false));

    return { user, session };
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@CurrentUser() user: AuthenticatedUser & { exp: number; sessionStart: number }, @Res({ passthrough: true }) res: Response) {
    const { access_token, ...result } = await this.authService.refresh(user);
    if (access_token) res.cookie('evaluadorToken', access_token, cookieOptions(this.config.get<string>('app.nodeEnv', 'development'), true));
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: LOGIN_RATE_LIMIT, ttl: 60_000 } })
  @Post('password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser & { exp: number; sessionStart: number },
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sesionVersion } = await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    // La sesión que cambia la contraseña sigue viva: cookie nueva con la
    // versión recién subida, conservando el inicio de sesión.
    const access_token = await this.authService.reissueEvaluatorToken(user, sesionVersion);
    res.cookie('evaluadorToken', access_token, cookieOptions(this.config.get<string>('app.nodeEnv', 'development'), true));
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    await this.authService.logout((req as Request & { cookies?: Record<string, string> }).cookies?.evaluadorToken);
    res.clearCookie('evaluadorToken', cookieOptions(nodeEnv, true));
    res.clearCookie('csrfToken', cookieOptions(nodeEnv, false));
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser & { exp: number }) {
    return this.authService.getEvaluatorProfile(user.id).then((perfil) => ({
      user: perfil,
      session: { expiresAt: user.exp * 1000 },
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

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('participants/consent')
  registerParticipantConsent(@Body() dto: RegisterParticipantConsentDto) {
    return this.authService.registerParticipantConsent(
      dto.participanteId,
      dto.proyectoId,
      dto.aceptado,
      dto.version,
      dto.resumeToken,
    );
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('participants/token')
  participantToken(@Body() dto: ParticipantTokenDto) {
    return this.authService.issueParticipantToken(
      dto.participanteId,
      dto.proyectoId,
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
