// packages/shared-types/src/base-payload.schema.ts
import { z } from 'zod';

// Estandarizado exactamente con los nombres que Prisma usará en la BD
export const ToolTypeSchema = z.enum([
  'HEURISTIC_EVAL',
  'CARD_SORTING',
  'PERSONA',
  'JOURNEY_MAP',
  'MOMENTOS_CRITICOS'
]);

export type ToolType = z.infer<typeof ToolTypeSchema>;

// Función generadora del Wrapper Base para envolver cualquier herramienta
export const createBasePayloadSchema = <T extends z.ZodTypeAny>(payloadSchema: T) => {
  return z.object({
    schemaVersion: z.literal('1.0'),
    toolType: ToolTypeSchema,
    createdAt: z.string().datetime(),
    lastUpdated: z.string().datetime(),
    payload: payloadSchema,
  });
};
