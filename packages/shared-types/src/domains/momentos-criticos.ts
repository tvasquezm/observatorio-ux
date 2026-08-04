// packages/shared-types/src/domains/momentos-criticos.ts
//
// Mapa de Momentos Críticos (matriz de fricción de incidentes).
// Persistido como UxArtifact (tipo = 'MOMENTOS_CRITICOS'), versionado +
// lock pesimista — ver common/ux-artifact-base.schema.ts.

import { z } from 'zod';
import {
  createUxArtifactSchema,
  createUxArtifactCreateSchema,
  createUxArtifactUpdateSchema,
} from '../common/ux-artifact-base.schema';

export const ImpactoIncidenteSchema = z.enum(['ALTO', 'MEDIO', 'BAJO']);

export const FrecuenciaIncidenteSchema = z.enum([
  'SIEMPRE',
  'FRECUENTE',
  'OCASIONAL',
  'RARA_VEZ',
]);

export const IncidenteCriticoSchema = z.object({
  titulo: z.string().min(1, 'El título del incidente es requerido'),
  descripcion: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  impacto: ImpactoIncidenteSchema,
  frecuencia: FrecuenciaIncidenteSchema,
  causaRaiz: z.string().min(1, 'La causa raíz es requerida'),
  accionesSugeridas: z
    .array(z.string().min(1))
    .min(1, 'Debe incluir al menos una acción sugerida de mitigación'),
  etapaOTouchpoint: z.string().optional(),
});

export const MomentosCriticosContenidoSchema = z.object({
  journeyMapAsociadoId: z
    .string()
    .uuid()
    .optional()
    .describe('artefactoLogicoId de un UxArtifact tipo JOURNEY_MAP, si aplica'),
  incidentes: z
    .array(IncidenteCriticoSchema)
    .min(1, 'Debe registrar al menos un incidente'),
});

export const MomentosCriticosArtifactSchema = createUxArtifactSchema(
  MomentosCriticosContenidoSchema,
);
export const CreateMomentosCriticosArtifactSchema =
  createUxArtifactCreateSchema(MomentosCriticosContenidoSchema);
export const UpdateMomentosCriticosArtifactSchema =
  createUxArtifactUpdateSchema(MomentosCriticosContenidoSchema);

export type ImpactoIncidente = z.infer<typeof ImpactoIncidenteSchema>;
export type FrecuenciaIncidente = z.infer<typeof FrecuenciaIncidenteSchema>;
export type IncidenteCritico = z.infer<typeof IncidenteCriticoSchema>;
export type MomentosCriticosContenido = z.infer<
  typeof MomentosCriticosContenidoSchema
>;
export type MomentosCriticosArtifact = z.infer<
  typeof MomentosCriticosArtifactSchema
>;
export type CreateMomentosCriticosArtifact = z.infer<
  typeof CreateMomentosCriticosArtifactSchema
>;
export type UpdateMomentosCriticosArtifact = z.infer<
  typeof UpdateMomentosCriticosArtifactSchema
>;
