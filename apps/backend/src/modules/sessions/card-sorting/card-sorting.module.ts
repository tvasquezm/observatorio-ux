import { Module } from '@nestjs/common';
import { CardSortingController } from './card-sorting.controller';
import { CardSortingService } from './card-sorting.service';

@Module({
  controllers: [CardSortingController], // <-- ¡Vital que esté aquí!
  providers: [CardSortingService],
})
export class CardSortingModule {}