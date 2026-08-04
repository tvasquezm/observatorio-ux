// packages/shared-types/src/domains/card-sorting.ts
//
// Reconstruido a partir de los DTOs y el servicio reales
// (apps/backend/src/modules/sessions/card-sorting/), no del tipo local
// desalineado que existía en el frontend (card-sorting.api.ts declaraba
// `tarjetas: string[]`, pero el backend siempre esperó
// `tarjetas: { etiqueta: string }[]`). Esta es ahora la fuente única de
// verdad para ambos lados.
//
// Auditoría 2026-08-04 (escalado a 5 metodologías):
//   - TipoCardSortingSchema gana HIBRIDO (antes solo ABIERTO | CERRADO).
//     En HIBRIDO, igual que en ABIERTO, el participante puede crear
//     categorías nuevas además de usar las predefinidas — ver el fix de
//     lógica correspondiente en card-sorting.service.ts (antes esa regla
//     solo chequeaba `tipo === 'ABIERTO'`).
//   - Se agregan los schemas de resultado agregado (frecuencia de
//     asociación + nivel de consenso) que pedía el requerimiento y que
//     no existían.

import { z } from 'zod';

export const TipoCardSortingSchema = z.enum(['ABIERTO', 'CERRADO', 'HIBRIDO']);

export const TarjetaInputSchema = z.object({
  etiqueta: z.string().min(1, 'La etiqueta de la tarjeta es requerida'),
});

export const CategoriaInputSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la categoría es requerido'),
});

export const CreateCardSortingSessionSchema = z.object({
  proyectoId: z.string().uuid(),
  tipo: TipoCardSortingSchema.optional(),
  tarjetas: z
    .array(TarjetaInputSchema)
    .min(1, 'Debe incluir al menos una tarjeta'),
  categorias: z.array(CategoriaInputSchema).optional().default([]),
});

export const GrupoSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    categoriaNombre: z.string().optional(),
    cardIds: z
      .array(z.string().uuid())
      .min(1, 'Cada grupo requiere al menos una tarjeta'),
  })
  .refine((g) => !!g.categoriaId || !!g.categoriaNombre, {
    message: 'Cada grupo requiere categoriaId o categoriaNombre.',
  });

export const SubmitCardSortingResultSchema = z.object({
  grupos: z.array(GrupoSchema).min(1, 'Debe incluir al menos un grupo'),
});

// --- Entidades persistidas (reflejan los modelos Card / Category /
//     CardGrouping de schema.prisma) — usadas para tipar respuestas. ---

export const CardSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  etiqueta: z.string(),
  createdAt: z.coerce.date(),
});

export const CategorySchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  nombre: z.string(),
  esPredefinida: z.boolean(),
  creadaPorParticipanteId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

export const CardGroupingSchema = z.object({
  id: z.string().uuid(),
  participanteSesionId: z.string().uuid(),
  cardId: z.string().uuid(),
  categoryId: z.string().uuid(),
  card: CardSchema,
  category: CategorySchema,
  createdAt: z.coerce.date(),
});

// --- Resultado agregado: frecuencia de asociación + consenso ---

/** Cuántos participantes pusieron esta tarjeta en esta categoría, y qué % representa. */
export const FrecuenciaAsociacionSchema = z.object({
  cardId: z.string().uuid(),
  categoryId: z.string().uuid(),
  conteo: z.number().int().min(0),
  porcentaje: z.number().min(0).max(100),
});

/**
 * Consenso por tarjeta: a qué categoría fue mayoritariamente asignada y
 * qué tan de acuerdo estuvieron los participantes (0 = sin acuerdo,
 * 1 = acuerdo total).
 */
export const ConsensoTarjetaSchema = z.object({
  cardId: z.string().uuid(),
  categoriaMasFrecuenteId: z.string().uuid().nullable(),
  nivelConsenso: z.number().min(0).max(1),
  totalParticipantes: z.number().int().min(0),
});

export const CardSortingResultadoAgregadoSchema = z.object({
  frecuencias: z.array(FrecuenciaAsociacionSchema),
  consensoPorTarjeta: z.array(ConsensoTarjetaSchema),
});

export type TarjetaInput = z.infer<typeof TarjetaInputSchema>;
export type CategoriaInput = z.infer<typeof CategoriaInputSchema>;
export type CreateCardSortingSession = z.infer<
  typeof CreateCardSortingSessionSchema
>;
export type Grupo = z.infer<typeof GrupoSchema>;
export type SubmitCardSortingResult = z.infer<
  typeof SubmitCardSortingResultSchema
>;
export type CardEntity = z.infer<typeof CardSchema>;
export type CategoryEntity = z.infer<typeof CategorySchema>;
export type CardGroupingEntity = z.infer<typeof CardGroupingSchema>;
export type FrecuenciaAsociacion = z.infer<typeof FrecuenciaAsociacionSchema>;
export type ConsensoTarjeta = z.infer<typeof ConsensoTarjetaSchema>;
export type CardSortingResultadoAgregado = z.infer<
  typeof CardSortingResultadoAgregadoSchema
>;
