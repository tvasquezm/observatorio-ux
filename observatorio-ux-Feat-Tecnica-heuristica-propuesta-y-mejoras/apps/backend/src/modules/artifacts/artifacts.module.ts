import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { ArtifactsController } from './artifacts.controller.js';
import { ArtifactsService } from './artifacts.service.js';

@Module({
  controllers: [ArtifactsController],
  providers: [ArtifactsService, RolesGuard],
})
export class ArtifactsModule {}
