import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

// Estrategia dedicada a participanteToken (Bearer). Usa
// jwt.participanteSecret, distinto del secreto de evaluadorToken — un
// evaluadorToken jamás pasa la verificación de firma acá, ni al revés.
@Injectable()
export class JwtParticipanteStrategy extends PassportStrategy(Strategy, 'jwt-participante') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.participanteSecret'),
    });
  }

  async validate(payload: { sub: string; proyectoId?: string }) {
    return this.authService.validateTokenPayload({ ...payload, actor: 'PARTICIPANTE' });
  }
}
