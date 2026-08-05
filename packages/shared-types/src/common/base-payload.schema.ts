// packages/shared-types/src/common/base-payload.schema.ts
import { z } from 'zod';

/**
 * Envoltorio base para todo payload JSONB de ResearchSession (Grupo A:
 * Card Sorting, Evaluación Heurística). Combina metadatos de trazabilidad
 * con el contenido específico de cada metodología (`payload`).
 *
 * `createdAt`/`lastUpdated` se guardan también dentro del JSON (redundante
 * con las columnas de Prisma) para que el JSON exportado sea autocontenible.
 */
export function createBasePayloadSchema<T extends z.ZodTypeAny>(
  payloadSchema: T,
) {
  return z.object({
    schemaVersion: z.number().int().min(1).default(1),
    toolType: z.string(),
    createdAt: z.coerce.date(),
    lastUpdated: z.coerce.date(),
    payload: payloadSchema,
  });
}