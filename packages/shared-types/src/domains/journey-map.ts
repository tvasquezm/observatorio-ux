// packages/shared-types/src/domains/journey-map.ts
//
// Viaje de la Persona Usuaria (Journey Map). Persistido como UxArtifact
// (tipo = 'JOURNEY_MAP'), versionado + lock pesimista — ver
// common/ux-artifact-base.schema.ts.

import { z } from 'zod';
import {
  createUxArtifactSchema,
  createUxArtifactCreateSchema,
  createUxArtifactUpdateSchema,
} from '../common/ux-artifact-base.schema';

/**
 * Curva de experiencia emocional por etapa. -2 (muy negativo) a +2 (muy
 * positivo), igual que la escala típica de curva de emoción en journey
 * mapping.
 */
export const EmocionEtapaSchema = z.object({
  valor: z.number().int().min(-2).max(2),
  descripcion: z.string().optional(),
});

export const EtapaJourneySchema = z.object({
  nombre: z.string().min(1, 'El nombre de la etapa es requerido'),
  orden: z.number().int().min(0),
  acciones: z
    .array(z.string().min(1))
    .min(1, 'Cada etapa requiere al menos una acción del usuario'),
  emociones: EmocionEtapaSchema,
  touchpoints: z
    .array(z.string().min(1))
    .min(1, 'Cada etapa requiere al menos un punto de contacto'),
  oportunidades: z.array(z.string().min(1)).optional().default([]),
});

export const JourneyMapContenidoSchema = z.object({
  personaAsociadaId: z
    .string()
    .uuid()
    .optional()
    .describe('artefactoLogicoId de un UxArtifact tipo PERSONA, si aplica'),
  escenario: z.string().min(1, 'Describe el escenario/objetivo del viaje'),
  etapas: z
    .array(EtapaJourneySchema)
    .min(2, 'Un journey map requiere al menos 2 etapas'),
});

export const JourneyMapArtifactSchema = createUxArtifactSchema(
  JourneyMapContenidoSchema,
);
export const CreateJourneyMapArtifactSchema = createUxArtifactCreateSchema(
  JourneyMapContenidoSchema,
);
export const UpdateJourneyMapArtifactSchema = createUxArtifactUpdateSchema(
  JourneyMapContenidoSchema,
);

export type EmocionEtapa = z.infer<typeof EmocionEtapaSchema>;
export type EtapaJourney = z.infer<typeof EtapaJourneySchema>;
export type JourneyMapContenido = z.infer<typeof JourneyMapContenidoSchema>;
export type JourneyMapArtifact = z.infer<typeof JourneyMapArtifactSchema>;
export type CreateJourneyMapArtifact = z.infer<
  typeof CreateJourneyMapArtifactSchema
>;
export type UpdateJourneyMapArtifact = z.infer<
  typeof UpdateJourneyMapArtifactSchema
>;
