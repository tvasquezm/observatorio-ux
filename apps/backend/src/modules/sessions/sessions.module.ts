// src/modules/sessions/sessions.module.ts

import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import {
  EvaluacionHeuristicaController,
  EvaluacionHeuristicaAnalyticsController,
} from './evaluacion-heuristica/evaluacion-heuristica.controller.js';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica/evaluacion-heuristica.service.js';
import { HeuristicaEvidenciaService } from './evaluacion-heuristica/heuristica-evidencia.service.js';
import { CardSortingModule } from './card-sorting/card-sorting.module.js';
@Module({
  imports: [CardSortingModule],
  controllers: [EvaluacionHeuristicaController, EvaluacionHeuristicaAnalyticsController],
  providers: [EvaluacionHeuristicaService, HeuristicaEvidenciaService, RolesGuard],
})
export class SessionsModule {}
