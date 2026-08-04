// apps/backend/src/modules/artefactos/persona/dto/persona.dto.ts
import { createZodDto } from 'nestjs-zod';
import {
  CreatePersonaArtifactSchema,
  UpdatePersonaArtifactSchema,
} from '@observatorio-ux/shared-types';

export class CreatePersonaDto extends createZodDto(
  CreatePersonaArtifactSchema,
) {}

export class UpdatePersonaDto extends createZodDto(
  UpdatePersonaArtifactSchema,
) {}
