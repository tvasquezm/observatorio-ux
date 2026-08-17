import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';

@Module({
  controllers: [ArtifactsController],
  providers: [ArtifactsService, RolesGuard],
})
export class ArtifactsModule {}
