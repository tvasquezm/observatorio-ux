import { Module } from '@nestjs/common';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { CardSortingController } from './card-sorting.controller.js';
import { CardSortingService } from './card-sorting.service.js';

@Module({
  controllers: [CardSortingController], // <-- ¡Vital que esté aquí!
  providers: [CardSortingService, RolesGuard],
})
export class CardSortingModule {}
