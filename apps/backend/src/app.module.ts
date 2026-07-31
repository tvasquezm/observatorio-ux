import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './core/database/database.module';

import databaseConfig from './core/config/database.config';
import jwtConfig from './core/config/jwt.config';
import { envValidationSchema } from './core/config/env.validation';

import { SessionsModule } from './modules/sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      validationSchema: envValidationSchema,
    }),

    DatabaseModule,

    SessionsModule,
  ],
})
export class AppModule {}