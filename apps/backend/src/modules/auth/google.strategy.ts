import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

// Solo pedimos email/perfil — alcanza para identificar y auto-registrar al
// EVALUADOR (Regla de negocio: login Google es exclusivo de EVALUADOR, ver
// AuthService.loginOrCreateFromGoogle). No se usa para PARTICIPANTE.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('google.clientId'),
      clientSecret: config.getOrThrow<string>('google.clientSecret'),
      callbackURL: config.getOrThrow<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  // Passport llama a esto tras el intercambio de código por token con
  // Google. No consultamos la BD acá — eso lo hace el controller vía
  // AuthService, para mantener la estrategia solo como adaptador del
  // perfil de Google a la forma que espera el resto del flujo.
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    const nombre = profile.displayName;

    if (!email) {
      done(new Error('La cuenta de Google no tiene un email disponible.'), undefined);
      return;
    }

    done(null, { email, nombre });
  }
}
