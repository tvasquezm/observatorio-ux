import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, ParticipantTokenDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
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
