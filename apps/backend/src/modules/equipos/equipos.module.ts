import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { EquiposController } from './equipos.controller.js';
import { EquiposService } from './equipos.service.js';

@Module({
  controllers: [EquiposController],
  providers: [EquiposService, RolesGuard],
})
export class EquiposModule {}
