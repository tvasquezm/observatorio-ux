import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/database.module';
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
    DatabaseModule,
    AuthModule,
    ArtifactsModule,
    ProjectsModule,
    SessionsModule,
  ],
  providers: [RolesGuard],
  controllers: [HealthController],
})
export class AppModule {}
