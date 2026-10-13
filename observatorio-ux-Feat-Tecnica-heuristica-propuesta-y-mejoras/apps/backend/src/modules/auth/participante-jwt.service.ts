import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

/**
 * Firma/verifica participanteToken con JWT_PARTICIPANTE_SECRET — nunca el
 * mismo secreto que evaluadorToken (jwt.secret / AuthService.signEvaluatorToken).
 * Instancia propia de JwtService en vez de reutilizar el JwtModule global,
 * para que un token firmado acá sea inválido contra la estrategia 'jwt'
 * (evaluador) y viceversa, sin depender solo del claim `actor`.
 */
@Injectable()
export class ParticipanteJwtService {
  private readonly jwt: JwtService;

  constructor(config: ConfigService) {
    this.jwt = new JwtService({
      secret: config.getOrThrow<string>('jwt.participanteSecret'),
      signOptions: {
        expiresIn: config.get<string>('jwt.participanteExpiresIn', '4h') as JwtSignOptions['expiresIn'],
      },
    });
  }

  sign(payload: object) {
    return this.jwt.signAsync(payload);
  }

  verify<T extends object = any>(token: string): Promise<T> {
    return this.jwt.verifyAsync<T>(token);
  }
}
