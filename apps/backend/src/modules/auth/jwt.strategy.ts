import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AuthService } from './auth.service';

// EVALUADOR pasa a autenticarse por cookie httpOnly `evaluadorToken`
// (Fase 3 — ver docs/ARCHITECTURE.md). PARTICIPANTE sigue con Bearer
// token (lib/api-client.ts en el frontend, flujo de encuestas). El mismo
// secreto firma ambos, así que un solo extractor combinado alcanza: si no
// hay cookie, cae al header Authorization de siempre.
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
