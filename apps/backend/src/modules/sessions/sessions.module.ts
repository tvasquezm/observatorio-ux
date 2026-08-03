// src/modules/sessions/sessions.module.ts

import { Module } from '@nestjs/common';
import { EvaluacionHeuristicaController } from './evaluacion-heuristica/evaluacion-heuristica.controller';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica/evaluacion-heuristica.service';
import { CardSortingModule } from './card-sorting/card-sorting.module';

@Module({
  imports: [CardSortingModule],
  controllers: [EvaluacionHeuristicaController],
  providers: [EvaluacionHeuristicaService],
})
export class SessionsModule {}