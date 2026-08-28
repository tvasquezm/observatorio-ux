import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  LoginDto,
  ParticipantTokenDto,
  RegisterParticipantDto,
  RegisterParticipantConsentDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Límite estricto: es el blanco más obvio de fuerza bruta (probar
  // contraseñas contra un email conocido). 5 intentos / minuto por IP,
  // contra el default global de 60/min del resto de la API.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
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
