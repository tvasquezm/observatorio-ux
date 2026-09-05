import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  LoginDto,
  ParticipantTokenDto,
  RegisterParticipantDto,
  RegisterParticipantConsentDto,
} from './auth.dto';
import type { AuthenticatedUser } from './types/authenticated-user.interface';

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

  // Límite estricto: es el blanco más obvio de fuerza bruta (probar
  // contraseñas contra un email conocido). 5 intentos / minuto por IP,
  // contra el default global de 60/min del resto de la API.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.login(
      dto.email,
      dto.password,
    );
    const nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    const csrfToken = randomBytes(32).toString('hex');

    res.cookie('evaluadorToken', access_token, cookieOptions(nodeEnv, true));
    res.cookie('csrfToken', csrfToken, cookieOptions(nodeEnv, false));

    return { user };
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

  // No piden credenciales previas (cualquiera puede intentar registrar un
  // email como participante), así que también van más estrictos que el
  // default global.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('participants/register')
  registerParticipant(@Body() dto: RegisterParticipantDto) {
    return this.authService.registerParticipant(
      dto.proyectoId,
      dto.email,
      dto.nombre,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('participants/consent')
  registerParticipantConsent(@Body() dto: RegisterParticipantConsentDto) {
    return this.authService.registerParticipantConsent(
      dto.participanteId,
      dto.proyectoId,
      dto.aceptado,
      dto.version,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('participants/token')
  participantToken(@Body() dto: ParticipantTokenDto) {
    return this.authService.issueParticipantToken(
      dto.participanteId,
      dto.proyectoId,
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
