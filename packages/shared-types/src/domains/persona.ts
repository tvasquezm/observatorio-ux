// packages/shared-types/src/domains/persona.ts
//
// Perfil de Persona Usuaria (arquetipo). Persistido como UxArtifact
// (tipo = 'PERSONA'), versionado + lock pesimista — ver
// common/ux-artifact-base.schema.ts.

import { z } from 'zod';
import {
  createUxArtifactSchema,
  createUxArtifactCreateSchema,
  createUxArtifactUpdateSchema,
} from '../common/ux-artifact-base.schema';

export const PersonaContenidoSchema = z.object({
  nombre: z.string().min(1, 'El nombre del arquetipo es requerido'),
  rolOAvatar: z.string().optional(),
  objetivos: z
    .array(z.string().min(1))
    .min(1, 'Debe incluir al menos un objetivo'),
  necesidades: z
    .array(z.string().min(1))
    .min(1, 'Debe incluir al menos una necesidad'),
  frustraciones: z
    .array(z.string().min(1))
    .min(1, 'Debe incluir al menos una frustración'),
  contextoDeUso: z
    .string()
    .min(10, 'Describe el escenario de uso con al menos 10 caracteres'),
  motivacionesPrincipales: z
    .array(z.string().min(1))
    .min(1, 'Debe incluir al menos una motivación principal'),
});

export const PersonaArtifactSchema = createUxArtifactSchema(
  PersonaContenidoSchema,
);
export const CreatePersonaArtifactSchema = createUxArtifactCreateSchema(
  PersonaContenidoSchema,
);
export const UpdatePersonaArtifactSchema = createUxArtifactUpdateSchema(
  PersonaContenidoSchema,
);

export type PersonaContenido = z.infer<typeof PersonaContenidoSchema>;
export type PersonaArtifact = z.infer<typeof PersonaArtifactSchema>;
export type CreatePersonaArtifact = z.infer<typeof CreatePersonaArtifactSchema>;
export type UpdatePersonaArtifact = z.infer<typeof UpdatePersonaArtifactSchema>;
