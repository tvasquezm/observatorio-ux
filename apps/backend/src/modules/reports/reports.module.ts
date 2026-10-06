import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module.js';
import { ProjectAccessModule } from '../../core/access/project-access.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [DatabaseModule, ProjectAccessModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
