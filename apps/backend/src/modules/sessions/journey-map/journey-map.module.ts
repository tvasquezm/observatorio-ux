// apps/backend/src/modules/artefactos/journey-map/journey-map.module.ts
import { Module } from '@nestjs/common';
import { JourneyMapController } from './journey-map.controller';
import { JourneyMapService } from './journey-map.service';
import { UxArtifactModule } from '../../../core/ux-artifact/ux-artifact.module';

@Module({
  imports: [UxArtifactModule],
  controllers: [JourneyMapController],
  providers: [JourneyMapService],
})
export class JourneyMapModule {}
