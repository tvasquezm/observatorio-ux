// packages/shared-types/src/domains/evaluacion-heuristica.ts
import { z } from 'zod';
import { createBasePayloadSchema } from '../common/base-payload.schema';

/**
 * Payload que envía el cliente al registrar un hallazgo:
 *   PATCH /proyectos/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/hallazgos
 *
 * No incluye `id` ni `registradoEn` — ambos los genera el backend.
 *
 * Nota de la refactorización (2026-08-04): `severidad` se alineó a 0-4
 * (escala de Nielsen), que es el rango real que ya validaba el DTO en
 * producción — el schema anterior exigía 1-4 y nunca estuvo conectado.
 * `capturaPantallaUrl` se agrega como campo requerido (antes solo
 * existía en este schema pero no en el DTO real del backend).
 *
 * Auditoría 2026-08-04 (escalado a 5 metodologías): se agrega
 * `responsables`, que el schema declaraba como requerimiento pero no
 * existía ni en el schema Zod ni en el service real. Se modela como un
 * arreglo de IDs de usuario (no de nombres libres) para que quede
 * consultable/asignable — igual que `evaluadorId` en el resto del
 * dominio. Si tu equipo prefiere nombres libres de texto, cambia el
 * `.uuid()` por `.min(1)`.
 */
export const HallazgoInputSchema = z.object({
  heuristicaId: z.string().min(1, 'heuristicaId es requerido'),
  severidad: z.number().int().min(0).max(4),
  descripcion: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  capturaPantallaUrl: z.string().url('Debe ser una URL válida'),
  evidencia: z.string().optional(),
  recomendacion: z.string().optional(),
  responsables: z
    .array(z.string().uuid())
    .min(1, 'Debe asignar al menos un responsable'),
});

/** Hallazgo tal como queda persistido (incluye metadatos generados por el servidor). */
export const HallazgoSchema = HallazgoInputSchema.extend({
  id: z.string().uuid(),
  registradoEn: z.coerce.date(),
});

export const EvaluacionHeuristicaPayloadSchema = z.object({
  hallazgos: z.array(HallazgoSchema),
});

// 1. Esquema completo de la sesión (para validar la respuesta de GET :sesionId)
export const EvaluacionHeuristicaSchema = createBasePayloadSchema(
  EvaluacionHeuristicaPayloadSchema,
);

// --- Autoguardado ---

/** Versión de HallazgoInput con todos los campos opcionales, para autosave. */
export const HallazgoInputPartialSchema = HallazgoInputSchema.partial();

/** Payload parcial: el array puede venir vacío/ausente, y cada hallazgo
 *  dentro del array puede estar incompleto mientras el usuario escribe. */
export const EvaluacionHeuristicaPayloadPartialSchema = z.object({
  hallazgos: z.array(HallazgoInputPartialSchema).optional(),
});

// 2. Esquema parcial (autoguardado / respuestas incompletas en el cliente)
export const EvaluacionHeuristicaPartialSchema = createBasePayloadSchema(
  EvaluacionHeuristicaPayloadPartialSchema,
).partial();

export type HallazgoInput = z.infer<typeof HallazgoInputSchema>;
export type HallazgoInputPartial = z.infer<typeof HallazgoInputPartialSchema>;
export type Hallazgo = z.infer<typeof HallazgoSchema>;
export type EvaluacionHeuristica = z.infer<typeof EvaluacionHeuristicaSchema>;
export type EvaluacionHeuristicaPartial = z.infer<typeof EvaluacionHeuristicaPartialSchema>;