import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AuthService } from './auth.service';

// EVALUADOR se autentica exclusivamente por cookie httpOnly `evaluadorToken`
// (Fase 3 — ver docs/ARCHITECTURE.md), firmada con jwt.secret. PARTICIPANTE
// usa su propia estrategia (JwtParticipanteStrategy, jwt.participanteSecret)
// — ya no comparten secreto ni extractor (Regla de negocio: Segregación de
// Auth). Se mantiene el fallback a Authorization Bearer solo para clientes
// evaluador que aún no migraron a cookie (Swagger, tests).
function cookieExtractor(req: Request): string | null {
  return (req as any)?.cookies?.evaluadorToken ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    rol?: string;
    actor?: string;
    proyectoId?: string;
  }) {
    return this.authService.validateTokenPayload(payload);
  }
}
