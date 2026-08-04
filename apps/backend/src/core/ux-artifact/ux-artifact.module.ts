// apps/backend/src/core/ux-artifact/ux-artifact.module.ts
import { Module } from '@nestjs/common';
import { UxArtifactService } from './ux-artifact.service';

@Module({
  providers: [UxArtifactService],
  exports: [UxArtifactService],
})
export class UxArtifactModule {}
