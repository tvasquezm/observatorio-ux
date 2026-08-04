// apps/backend/src/modules/artefactos/momentos-criticos/dto/momentos-criticos.dto.ts
import { createZodDto } from 'nestjs-zod';
import {
  CreateMomentosCriticosArtifactSchema,
  UpdateMomentosCriticosArtifactSchema,
} from '@observatorio-ux/shared-types';

export class CreateMomentosCriticosDto extends createZodDto(
  CreateMomentosCriticosArtifactSchema,
) {}

export class UpdateMomentosCriticosDto extends createZodDto(
  UpdateMomentosCriticosArtifactSchema,
) {}
