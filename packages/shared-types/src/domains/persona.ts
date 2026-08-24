import { z } from 'zod';

/**
 * Schema de validación para el contenido de un artefacto de tipo PERSONA.
 * Representa una ficha de arquetipo de usuario (persona/buyer persona) usada
 * en investigación UX.
 *
 * Nota: `id`, `proyectoId`, `version`, etc. NO forman parte de este schema,
 * ya que esos metadatos pertenecen al artefacto contenedor (UxArtifact) y
 * no deben duplicarse dentro del JSON de contenido.
 */
export const PersonaSchema = z.object({
  // ── 1. Datos de identificación y demográficos ──────────────────────────
  nombreCompleto: z
    .string()
    .min(1, 'El nombre y apellido son obligatorios.')
    .max(150),
  edad: z
    .number()
    .int()
    .min(0, 'La edad no puede ser negativa.')
    .max(120)
    .optional(),
  ocupacion: z
    .string()
    .max(150)
    .optional()
    .describe('Ocupación, profesión o cargo de la persona.'),
  fotografiaUrl: z
    .string()
    .url('Debe ser una URL válida.')
    .optional(),
  acercaDe: z
    .string()
    .max(2000)
    .optional()
    .describe('Biografía o descripción narrativa breve.'),
  familia: z.string().max(500).optional(),
  hobbies: z.array(z.string().min(1)).optional().default([]),
  habilidades: z.array(z.string().min(1)).optional().default([]),

  // ── 2. Aspectos psicológicos, conductuales y de UX ──────────────────────
  objetivos: z.array(z.string().min(1)).optional().default([]),
  necesidades: z.array(z.string().min(1)).optional().default([]),
  motivaciones: z.array(z.string().min(1)).optional().default([]),
  frustraciones: z
    .array(z.string().min(1))
    .optional()
    .default([])
    .describe('Frustraciones y dificultades (barreras) que enfrenta la persona.'),
  comportamientos: z.array(z.string().min(1)).optional().default([]),
  contextoDeUso: z
    .string()
    .max(1000)
    .optional()
    .describe('Entorno físico, temporal o sociocultural de la interacción.'),
  expectativas: z.array(z.string().min(1)).optional().default([]),
});

export type Persona = z.infer<typeof PersonaSchema>;