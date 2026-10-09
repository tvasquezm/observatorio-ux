import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

// El login con Google es opcional: solo queda habilitado si están las tres
// variables GOOGLE_*. Sin ellas la estrategia no se registra y las rutas
// /auth/google* redirigen al login con un mensaje (ver GoogleOauthGuard).
export function isGoogleConfigured(config: ConfigService): boolean {
  return Boolean(
    config.get<string>('google.clientId') &&
      config.get<string>('google.clientSecret') &&
      config.get<string>('google.callbackUrl'),
  );
}

// Solo pedimos email/perfil — alcanza para identificar al EVALUADOR (Regla
// de negocio: login Google es exclusivo de EVALUADOR, ver
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
  // AuthService. Se exige email verificado por Google: sin eso, cualquiera
  // podría reclamar el email de otra persona.
  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const emailInfo = profile.emails?.[0];
    const email = emailInfo?.value;
    const jsonVerified = (profile as { _json?: { email_verified?: unknown } })._json
      ?.email_verified;
    const verified =
      (emailInfo as { verified?: unknown } | undefined)?.verified ?? jsonVerified;

    if (!email) {
      done(new Error('La cuenta de Google no tiene un email disponible.'), undefined);
      return;
    }
    if (verified !== true && verified !== 'true') {
      done(new Error('El email de la cuenta de Google no está verificado.'), undefined);
      return;
    }

    done(null, { email, nombre: profile.displayName });
  }
}
