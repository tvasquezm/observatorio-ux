// packages/shared-types/src/evaluacion-heuristica.ts
import { z } from 'zod';
import { BaseMetadataSchema, createBasePayloadSchema } from '../common/base-payload.schema';

export const HallazgoSchema = z.object({
  id: z.string().uuid(),
  heuristicaId: z.string(),
  severidad: z.number().int().min(1).max(4),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  capturaPantallaUrl: z.string().url('Debe ser una URL válida'),
});

export const EvaluacionHeuristicaPayloadSchema = z.object({
  hallazgos: z.array(HallazgoSchema),
});

// 1. Esquema Completo (Para la validación estricta en POST /finalizar)
export const EvaluacionHeuristicaSchema = createBasePayloadSchema(EvaluacionHeuristicaPayloadSchema);

// 2. Esquema Parcial (Para autoguardado en PATCH y React-Hook-Form)
//
// zod v4 eliminó `.deepPartial()` (existía en v3). Se arma a mano:
export const EvaluacionHeuristicaPartialSchema = BaseMetadataSchema.partial().extend({
  hallazgos: z.array(HallazgoSchema.partial()).optional(),
});

export type Hallazgo = z.infer<typeof HallazgoSchema>;
export type EvaluacionHeuristica = z.infer<typeof EvaluacionHeuristicaSchema>;
