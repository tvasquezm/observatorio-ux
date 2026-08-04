// packages/shared-types/src/common/ux-artifact-base.schema.ts
//
// Equivalente a base-payload.schema.ts pero para el modelo UxArtifact
// (Persona, Journey Map, Momentos Críticos). Fuente de verdad: modelo
// `UxArtifact` y enum `TipoArtefacto` en apps/backend/prisma/schema.prisma
// (ver apps/backend/prisma/schema.additions.prisma en este mismo entregable).

import { z } from 'zod';

export const TipoArtefactoSchema = z.enum([
  'PERSONA',
  'JOURNEY_MAP',
  'MOMENTOS_CRITICOS',
]);

/** TTL por defecto del lock pesimista de edición. */
export const UX_ARTIFACT_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Combina los campos base de un UxArtifact con el `contenido` específico
 * de una metodología (p. ej. `objetivos`/`necesidades` en Persona).
 *
 * Uso:
 *   const PersonaArtifactSchema = createUxArtifactSchema(PersonaContenidoSchema);
 */
export function createUxArtifactSchema<T extends z.ZodRawShape>(
  contenidoSchema: z.ZodObject<T>,
) {
  return z.object({
    id: z.string().uuid(),
    proyectoId: z.string().uuid(),
    tipo: TipoArtefactoSchema,
    artefactoLogicoId: z.string().uuid(),
    version: z.number().int().min(1),
    contenido: contenidoSchema,
    autorId: z.string().uuid(),
    lockedById: z.string().uuid().nullable().optional(),
    lockedUntil: z.coerce.date().nullable().optional(),
    createdAt: z.coerce.date(),
  });
}

/** Payload para crear la primera versión de un artefacto. */
export function createUxArtifactCreateSchema<T extends z.ZodRawShape>(
  contenidoSchema: z.ZodObject<T>,
) {
  return z.object({
    proyectoId: z.string().uuid(),
    contenido: contenidoSchema,
  });
}

/** Payload para guardar una nueva versión (requiere tener el lock vigente). */
export function createUxArtifactUpdateSchema<T extends z.ZodRawShape>(
  contenidoSchema: z.ZodObject<T>,
) {
  return z.object({
    contenido: contenidoSchema,
  });
}

export type TipoArtefacto = z.infer<typeof TipoArtefactoSchema>;
