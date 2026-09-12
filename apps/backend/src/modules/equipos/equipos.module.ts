import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';

@Module({
  controllers: [EquiposController],
  providers: [EquiposService, RolesGuard],
})
export class EquiposModule {}
