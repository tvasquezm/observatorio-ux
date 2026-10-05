import { z } from 'zod';

export const TipoCardSortingSchema = z.enum(['ABIERTO', 'CERRADO', 'HIBRIDO']);

export const CardSortingCardInputSchema = z.object({
  etiqueta: z.string().trim().min(1, 'Escribe el nombre de cada tarjeta.').max(100),
});

export const CardSortingCategoryInputSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre de cada categoría.').max(60),
});

export const CardSortingQuestionInputSchema = z.object({
  texto: z.string().trim().min(1).max(300),
});

export const CardSortingAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  respuesta: z.string().max(1000),
});

export const CreateCardSortingSessionPayloadSchema = z.object({
  proyectoId: z.string().uuid(),
  nombre: z.string().trim().min(1, 'Escribe el nombre del estudio.').max(120),
  tipo: TipoCardSortingSchema.optional(),
  tarjetas: z.array(CardSortingCardInputSchema)
    .min(1, 'Agrega al menos una tarjeta.').max(100)
    .refine((cards) => new Set(cards.map((card) => card.etiqueta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'))).size === cards.length,
      'Hay tarjetas repetidas. Usa un nombre distinto para cada tarjeta.'),
  categorias: z.array(CardSortingCategoryInputSchema)
    .refine((categories) => new Set(categories.map((category) => category.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es'))).size === categories.length,
      'Hay categorías repetidas. Usa un nombre distinto para cada categoría.')
    .optional(),
  preguntas: z.array(CardSortingQuestionInputSchema).max(5).optional(),
}).refine((study) => study.tipo !== 'CERRADO' || (study.categorias?.length ?? 0) >= 2, {
  path: ['categorias'],
  message: 'Agrega al menos dos categorías para el estudio cerrado.',
}).refine((study) => study.tipo !== 'HIBRIDO' || !!study.categorias?.length, {
  path: ['categorias'],
  message: 'Agrega al menos una categoría para el estudio híbrido.',
});

export const SubmitCardSortingGrupoSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    categoriaNombre: z.string().trim().min(1).max(60).optional(),
    categoriaPadre: z.string().trim().min(1).max(60).optional(),
    cardIds: z.array(z.string().uuid()).min(1),
  })
  .refine((grupo) => grupo.categoriaId || grupo.categoriaNombre, {
    message: 'Cada grupo debe identificar una categoría existente o indicar su nombre.',
  });

export const SubmitCardSortingResultPayloadSchema = z.object({
  grupos: z.array(SubmitCardSortingGrupoSchema).min(1),
  respuestas: z.array(CardSortingAnswerInputSchema).max(5).optional(),
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
export type CardSortingQuestionInput = z.infer<typeof CardSortingQuestionInputSchema>;
export type CardSortingAnswerInput = z.infer<typeof CardSortingAnswerInputSchema>;
