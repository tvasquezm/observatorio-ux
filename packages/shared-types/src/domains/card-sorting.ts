import { z } from 'zod';

export const TipoCardSortingSchema = z.enum(['ABIERTO', 'CERRADO']);

export const CardSortingCardInputSchema = z.object({
  etiqueta: z.string().trim().min(1, 'Escribe el nombre de cada tarjeta.'),
});

export const CardSortingCategoryInputSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre de cada categoría.'),
});

export const CreateCardSortingSessionPayloadSchema = z.object({
  proyectoId: z.string().uuid(),
  nombre: z.string().trim().min(1, 'Escribe el nombre del estudio.').max(120),
  tipo: TipoCardSortingSchema.optional(),
  tarjetas: z.array(CardSortingCardInputSchema)
    .min(1, 'Agrega al menos una tarjeta.')
    .refine((cards) => new Set(cards.map((card) => card.etiqueta.toLocaleLowerCase('es'))).size === cards.length,
      'Hay tarjetas repetidas. Usa un nombre distinto para cada tarjeta.'),
  categorias: z.array(CardSortingCategoryInputSchema)
    .refine((categories) => new Set(categories.map((category) => category.nombre.toLocaleLowerCase('es'))).size === categories.length,
      'Hay categorías repetidas. Usa un nombre distinto para cada categoría.')
    .optional(),
}).refine((study) => study.tipo !== 'CERRADO' || !!study.categorias?.length, {
  path: ['categorias'],
  message: 'Agrega al menos una categoría para el estudio cerrado.',
});

export const SubmitCardSortingGrupoSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    categoriaNombre: z.string().trim().min(1).optional(),
    cardIds: z.array(z.string().uuid()).min(1),
  })
  .refine((grupo) => grupo.categoriaId || grupo.categoriaNombre, {
    message: 'Cada grupo debe identificar una categoría existente o indicar su nombre.',
  });

export const SubmitCardSortingResultPayloadSchema = z.object({
  grupos: z.array(SubmitCardSortingGrupoSchema).min(1),
});

export type TipoCardSorting = z.infer<typeof TipoCardSortingSchema>;
export type CardSortingCardInput = z.infer<typeof CardSortingCardInputSchema>;
export type CardSortingCategoryInput = z.infer<typeof CardSortingCategoryInputSchema>;
export type CreateCardSortingSessionPayload = z.infer<
  typeof CreateCardSortingSessionPayloadSchema
>;
export type SubmitCardSortingGrupo = z.infer<typeof SubmitCardSortingGrupoSchema>;
export type SubmitCardSortingResultPayload = z.infer<
  typeof SubmitCardSortingResultPayloadSchema
>;
