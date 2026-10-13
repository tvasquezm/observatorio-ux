import { Module } from '@nestjs/common';
import { SalasController } from './salas.controller.js';
import { SalasService } from './salas.service.js';
import { DatabaseModule } from '../../core/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SalasController],
  providers: [SalasService],
})
export class SalasModule {}