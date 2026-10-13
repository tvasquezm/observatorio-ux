// packages/shared-types/src/common/base-payload.schema.ts
//
// Metadatos comunes a cualquier payload de sesión de investigación
// (evaluación heurística, card sorting, etc.). `createBasePayloadSchema`
// combina estos metadatos con el schema específico de cada técnica, para
// no repetir proyectoId/sesionId en cada dominio.

import { z, ZodObject, ZodRawShape } from 'zod';

export const BaseMetadataSchema = z.object({
  proyectoId: z.string().uuid().optional(),
  sesionId: z.string().uuid().optional(),
});

export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;

export function createBasePayloadSchema<Shape extends ZodRawShape>(
  payloadSchema: ZodObject<Shape>,
) {
  return BaseMetadataSchema.merge(payloadSchema);
}