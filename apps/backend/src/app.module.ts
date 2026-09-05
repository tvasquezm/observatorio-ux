import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './core/database/database.module';
import { ProjectAccessModule } from './core/access/project-access.module';
import appConfig from './core/config/app.config';
import databaseConfig from './core/config/database.config';
import { envValidationSchema } from './core/config/env.validation';
import jwtConfig from './core/config/jwt.config';
import { RolesGuard } from './core/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema: envValidationSchema,
      cache: true,
    }),
    // Límite global por defecto: 60 requests / 60s por IP. Endpoints
    // puntuales (como /auth/login) sobreescriben esto con @Throttle a algo
    // más estricto — ver auth.controller.ts.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    DatabaseModule,
    ProjectAccessModule,
    AuthModule,
    ArtifactsModule,
    ProjectsModule,
    SessionsModule,
  ],
  providers: [
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [HealthController],
})
export class AppModule {}
