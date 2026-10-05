import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtParticipanteStrategy } from './jwt-participante.strategy.js';
import { ParticipanteJwtService } from './participante-jwt.service.js';
import { ParticipanteTokenService } from './participante-token.service.js';
import { ParticipantesCleanupService } from './participantes-cleanup.service.js';

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
    ParticipanteJwtService,
    ParticipanteTokenService,
    ParticipantesCleanupService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
