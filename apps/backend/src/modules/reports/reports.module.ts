import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module';
import { ProjectAccessModule } from '../../core/access/project-access.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule, ProjectAccessModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
