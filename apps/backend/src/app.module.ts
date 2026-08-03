import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './core/database/database.module';

import databaseConfig from './core/config/database.config';
import jwtConfig from './core/config/jwt.config';
import { envValidationSchema } from './core/config/env.validation';

import { SessionsModule } from './modules/sessions/sessions.module';
// 1. Importa el módulo de autenticación
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      validationSchema: envValidationSchema,
    }),

    DatabaseModule,
    SessionsModule,
    
    // 2. Regístralo aquí para que proteja toda tu app
    AuthModule,
  ],
})
export class AppModule {}