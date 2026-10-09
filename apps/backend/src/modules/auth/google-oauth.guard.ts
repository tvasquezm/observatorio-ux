import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { isGoogleConfigured } from './google.strategy.js';

// Envuelve AuthGuard('google') para que un login con Google no disponible o
// fallido (usuario cancela el consentimiento, código inválido, etc.) vuelva
// al login con un código de error en vez de mostrar el JSON crudo de Nest.
@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const res = context.switchToHttp().getResponse<Response>();

    if (!isGoogleConfigured(this.config)) {
      res.redirect(this.loginUrl('google_no_disponible'));
      return false;
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      res.redirect(this.loginUrl('google_fallo'));
      return false;
    }
  }

  private loginUrl(error: string): string {
    const origin = this.config
      .getOrThrow<string>('app.corsOrigin')
      .replace(/\/+$/, '');
    return `${origin}/login?error=${error}`;
  }
}
