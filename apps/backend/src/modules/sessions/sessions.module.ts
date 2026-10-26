// src/modules/sessions/sessions.module.ts

import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CardSortingModule } from './card-sorting/card-sorting.module.js';
import { HeuristicaFlujoController } from './heuristica-flujo/heuristica-flujo.controller.js';
import { HeuristicaFlujoService } from './heuristica-flujo/heuristica-flujo.service.js';
@Module({
  imports: [CardSortingModule],
  controllers: [HeuristicaFlujoController],
  providers: [HeuristicaFlujoService, RolesGuard],
})
export class SessionsModule {}
