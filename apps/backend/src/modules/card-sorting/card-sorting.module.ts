// apps/backend/src/modules/card-sorting/card-sorting.module.ts
//
// Aislamiento: solo importa DatabaseModule (core). Si se elimina esta
// carpeta completa, ningún otro módulo debería romperse, porque nadie
// más importa nada desde modules/card-sorting/.

import { Module } from '@nestjs/common';
import { CardSortingController } from './card-sorting.controller';
import { CardSortingService } from './card-sorting.service';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CardSortingController],
  providers: [CardSortingService],
})
export class CardSortingModule {}