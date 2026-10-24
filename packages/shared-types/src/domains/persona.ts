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
.refine((value) => {
  // Se permiten imágenes locales comprimidas en formato data URL.
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) {
    return value.length <= 2_200_000;
  }

  // Validar URL HTTP(S) sin depender del tipo global URL.
  return /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(value);
}, 'Debe ser una URL HTTP(S) válida o una imagen local permitida.')
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

  // ── 3. Relación con el servicio ────────────────────────────────────────
  rolEnServicio: z
    .string()
    .max(1000)
    .optional()
    .describe(
      'Rol que cumple la persona dentro del servicio y su nivel de influencia.'
    ),
  relacionConServicio: z
    .string()
    .max(1500)
    .optional()
    .describe(
      'Relación actual con el servicio: tipo y frecuencia de interacción, canales, conocimiento y criticidad del objetivo.'
    ),
  caracteristicasDistintivas: z
    .array(z.string().min(1))
    .optional()
    .default([])
    .describe(
      'Características relevantes que permiten diferenciar este perfil de otros.'
    ),

  // ── 4. Evidencia y validación del perfil ───────────────────────────────
  evidencia: z
    .array(z.string().min(1))
    .optional()
    .default([])
    .describe(
      'Fuentes o evidencias utilizadas para construir y fundamentar el perfil.'
    ),
  estadoValidacion: z
    .enum(['PENDIENTE', 'VALIDADA'])
    .optional()
    .default('PENDIENTE')
    .describe('Estado de validación de la caracterización del perfil.'),
  observacionesValidacion: z
    .string()
    .max(1500)
    .optional()
    .describe(
      'Observaciones asociadas al proceso de validación del perfil.'
    ),
});

export type Persona = z.infer<typeof PersonaSchema>;