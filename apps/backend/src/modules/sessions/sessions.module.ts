import { Module } from '@nestjs/common';
import { SessionsController } from './evaluacion-heuristica/sessions.controller';
import { SessionsService } from './evaluacion-heuristica/sessions.service';
import { CardSortingModule } from './card-sorting/card-sorting.module';

@Module({
  imports: [CardSortingModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}