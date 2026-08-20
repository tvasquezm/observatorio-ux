import { Body, Controller, Get, Post } from '@nestjs/common';
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

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('participants/register')
  registerParticipant(@Body() dto: RegisterParticipantDto) {
    return this.authService.registerParticipant(
      dto.proyectoId,
      dto.email,
      dto.nombre,
    );
  }

  @Post('participants/consent')
  registerParticipantConsent(@Body() dto: RegisterParticipantConsentDto) {
    return this.authService.registerParticipantConsent(
      dto.participanteId,
      dto.proyectoId,
      dto.aceptado,
      dto.version,
    );
  }

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
