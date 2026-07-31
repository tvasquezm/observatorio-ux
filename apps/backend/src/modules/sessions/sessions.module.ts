import { Module } from '@nestjs/common';

import { SessionsController } from './evaluacion-heuristica/sessions.controller';
import { SessionsService } from './evaluacion-heuristica/sessions.service';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}