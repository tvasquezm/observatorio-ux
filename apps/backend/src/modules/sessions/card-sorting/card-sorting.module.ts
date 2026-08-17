import { Module } from '@nestjs/common';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { CardSortingController } from './card-sorting.controller';
import { CardSortingService } from './card-sorting.service';

@Module({
  controllers: [CardSortingController], // <-- ¡Vital que esté aquí!
  providers: [CardSortingService, RolesGuard],
})
export class CardSortingModule {}
