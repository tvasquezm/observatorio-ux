import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './core/database/database.module.js';
import { ProjectAccessModule } from './core/access/project-access.module.js';
import appConfig from './core/config/app.config.js';
import databaseConfig from './core/config/database.config.js';
import { envValidationSchema } from './core/config/env.validation.js';
import jwtConfig from './core/config/jwt.config.js';
import { RolesGuard } from './core/guards/roles.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ArtifactsModule } from './modules/artifacts/artifacts.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SessionsModule } from './modules/sessions/sessions.module.js';
import { HealthController } from './health.controller.js';
import { SalasModule } from './modules/salas/salas.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { EquiposModule } from './modules/equipos/equipos.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema: envValidationSchema,
      cache: true,
    }),
    // Límite global por defecto por IP (THROTTLE_LIMIT cada THROTTLE_TTL_MS; 60 por minuto si no se
    // configuran). Endpoints puntuales (como /auth/login) lo sobreescriben con @Throttle a algo más
    // estricto — ver auth.controller.ts. Con muchos usuarios tras una misma IP (una red institucional)
    // hay que subirlo; ver docs/BACKEND.md.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_LIMIT ?? 60) }],
    }),
    DatabaseModule,
    ProjectAccessModule,
    AuthModule,
    ArtifactsModule,
    ProjectsModule,
    ReportsModule,
    SessionsModule,
    SalasModule,
    CommentsModule,
    EquiposModule,
    UsersModule,
  ],
  providers: [
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [HealthController],
})
export class AppModule {}
