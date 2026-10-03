import { z } from 'zod';

export const TipoCardSortingSchema = z.enum(['ABIERTO', 'CERRADO', 'HIBRIDO']);

export const CardSortingCardInputSchema = z.object({
  etiqueta: z.string().trim().min(1).max(100),
});

export const CardSortingCategoryInputSchema = z.object({
  nombre: z.string().trim().min(1).max(60),
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
  nombre: z.string().trim().min(1).max(120),
  tipo: TipoCardSortingSchema.optional(),
  tarjetas: z.array(CardSortingCardInputSchema).min(1).max(100),
  categorias: z.array(CardSortingCategoryInputSchema).optional(),
  preguntas: z.array(CardSortingQuestionInputSchema).max(5).optional(),
});

export const SubmitCardSortingGrupoSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    categoriaNombre: z.string().trim().min(1).optional(),
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
