// src/modules/sessions/sessions.module.ts
import { Module } from '@nestjs/common';
import { EvaluacionHeuristicaController } from './evaluacion-heuristica/evaluacion-heuristica.controller';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica/evaluacion-heuristica.service';
import { CardSortingModule } from './card-sorting/card-sorting.module';
import { JourneyMapModule } from './journey-map/journey-map.module';
import { PersonaModule } from './persona/persona.module';
import { MomentosCriticosModule } from './momentos-criticos/momentos-criticos.module';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [
    CardSortingModule,
    JourneyMapModule,
    PersonaModule,
    MomentosCriticosModule,
  ],
  controllers: [EvaluacionHeuristicaController],
  providers: [EvaluacionHeuristicaService],
})
export class SessionsModule {}