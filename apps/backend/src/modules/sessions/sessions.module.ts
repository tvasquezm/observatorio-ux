// src/modules/sessions/sessions.module.ts

import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard';
import {
  EvaluacionHeuristicaController,
  EvaluacionHeuristicaAnalyticsController,
} from './evaluacion-heuristica/evaluacion-heuristica.controller';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica/evaluacion-heuristica.service';
import { HeuristicaEvidenciaService } from './evaluacion-heuristica/heuristica-evidencia.service';
import { CardSortingModule } from './card-sorting/card-sorting.module';
@Module({
  imports: [CardSortingModule],
  controllers: [EvaluacionHeuristicaController, EvaluacionHeuristicaAnalyticsController],
  providers: [EvaluacionHeuristicaService, HeuristicaEvidenciaService, RolesGuard],
})
export class SessionsModule {}
