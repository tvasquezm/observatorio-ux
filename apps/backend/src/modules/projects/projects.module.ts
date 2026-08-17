import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, RolesGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
