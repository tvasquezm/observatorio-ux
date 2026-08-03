// apps/backend/src/modules/card-sorting/dto/card-sorting.dto.ts
//
// Contratos Zod del módulo Card Sorting, alineados al modelo relacional
// (Card / Category / CardGrouping). Aislamiento: solo depende de zod y
// nestjs-zod, cero imports de otras metodologías.

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TipoCardSortingSchema = z.enum(['ABIERTO', 'CERRADO']);

// --- Creación de la sesión maestra (la arma el evaluador) ---

export const CreateCardSortingSessionSchema = z
  .object({
    proyectoId: z.string().uuid(),
    tipo: TipoCardSortingSchema,
    tarjetas: z
      .array(z.string().min(1).max(200))
      .min(2, 'Se requieren al menos 2 tarjetas para una sesión válida.'),
    categorias: z.array(z.string().min(1).max(120)).optional(),
  })
  .refine(
    (data) => data.tipo !== 'CERRADO' || (data.categorias?.length ?? 0) >= 2,
    {
      message:
        'El Card Sorting cerrado requiere al menos 2 categorías predefinidas.',
      path: ['categorias'],
    },
  );

export class CreateCardSortingSessionDto extends createZodDto(
  CreateCardSortingSessionSchema,
) {}

// --- Un participante se une a un estudio ya creado ---

export const JoinCardSortingSessionSchema = z.object({
  participanteId: z.string().uuid(),
});

export class JoinCardSortingSessionDto extends createZodDto(
  JoinCardSortingSessionSchema,
) {}

// --- Envío del resultado de agrupamiento de un participante ---
//
// Cada grupo referencia una categoría existente (categoriaId, típico de
// sorting CERRADO) O declara el nombre de una categoría nueva que el
// propio participante está inventando (categoriaNombre, solo válido en
// sorting ABIERTO) — nunca ambos, nunca ninguno.

const GrupoSchema = z
  .object({
    categoriaId: z.string().uuid().optional(),
    categoriaNombre: z.string().min(1).max(120).optional(),
    cardIds: z
      .array(z.string().uuid())
      .min(1, 'Cada grupo debe tener al menos una tarjeta.'),
  })
  .superRefine((grupo, ctx) => {
    const tieneId = !!grupo.categoriaId;
    const tieneNombre = !!grupo.categoriaNombre;

    if (tieneId === tieneNombre) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Cada grupo debe traer exactamente uno de: categoriaId (existente) o categoriaNombre (nueva).',
        path: ['categoriaId'],
      });
    }
  });

export const SubmitCardSortingResultSchema = z.object({
  grupos: z
    .array(GrupoSchema)
    .min(1, 'El resultado debe incluir al menos un grupo.'),
});

export class SubmitCardSortingResultDto extends createZodDto(
  SubmitCardSortingResultSchema,
) {}