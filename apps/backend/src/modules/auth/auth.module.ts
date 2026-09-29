import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtParticipanteStrategy } from './jwt-participante.strategy';
import { GoogleOauthGuard } from './google-oauth.guard';
import { GoogleStrategy, isGoogleConfigured } from './google.strategy';
import { ParticipanteJwtService } from './participante-jwt.service';
import { ParticipanteTokenService } from './participante-token.service';
import { ParticipantesCleanupService } from './participantes-cleanup.service';

@Module({
  imports: [
    ConfigModule,
    // Fase 7 (H5): registrado acá (no hace falta en AppModule) — Nest
    // descubre los @Cron() de cualquier módulo una vez que ScheduleModule
    // está presente en algún punto del árbol.
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiresIn', '1h') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtParticipanteStrategy,
    GoogleOauthGuard,
    // Solo se instancia (y registra en passport) si GOOGLE_* está completo.
    {
      provide: GoogleStrategy,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        if (isGoogleConfigured(config)) return new GoogleStrategy(config);
        const parcial = ['clientId', 'clientSecret', 'callbackUrl'].some((k) =>
          config.get<string>(`google.${k}`),
        );
        if (parcial) {
          new Logger('AuthModule').warn(
            'GOOGLE_* incompleto: login con Google deshabilitado (se requieren CLIENT_ID, CLIENT_SECRET y CALLBACK_URL).',
          );
        }
        return null;
      },
    },
    ParticipanteJwtService,
    ParticipanteTokenService,
    ParticipantesCleanupService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
