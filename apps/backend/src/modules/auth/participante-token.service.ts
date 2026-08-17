import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

/** Compatibilidad para consumidores antiguos; la emisión vive en AuthService. */
@Injectable()
export class ParticipanteTokenService {
  constructor(private readonly authService: AuthService) {}

  issue(participanteId: string, proyectoId: string) {
    return this.authService.issueParticipantToken(participanteId, proyectoId);
  }
}
