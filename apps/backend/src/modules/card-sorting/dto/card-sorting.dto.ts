import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createSessionSchema = z.object({
  proyectoId: z.string().uuid(),
  tipo: z.enum(['ABIERTO', 'CERRADO']).optional(),
  tarjetas: z.array(z.object({ etiqueta: z.string() })),
  categorias: z.array(z.object({ nombre: z.string() })).optional().default([]),
});

const joinSessionSchema = z.object({
  participanteId: z.string().uuid(),
});

const submitResultSchema = z.object({
  grupos: z.array(
    z.object({
      categoriaNombre: z.string(),
      cardIds: z.array(z.string().uuid()),
    })
  ),
});
export class CreateCardSortingSessionDto extends createZodDto(createSessionSchema) {}
export class JoinCardSortingSessionDto extends createZodDto(joinSessionSchema) {}
export class SubmitCardSortingResultDto extends createZodDto(submitResultSchema) {}