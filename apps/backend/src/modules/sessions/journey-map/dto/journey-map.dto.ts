// apps/backend/src/modules/artefactos/journey-map/dto/journey-map.dto.ts
import { createZodDto } from 'nestjs-zod';
import {
  CreateJourneyMapArtifactSchema,
  UpdateJourneyMapArtifactSchema,
} from '@observatorio-ux/shared-types';

export class CreateJourneyMapDto extends createZodDto(
  CreateJourneyMapArtifactSchema,
) {}

export class UpdateJourneyMapDto extends createZodDto(
  UpdateJourneyMapArtifactSchema,
) {}
