import { z } from 'zod';

/**
 * Emoción / Customer Happiness percibida durante una fase.
 */
export const HappinessEnum = z.enum(['Positiva', 'Neutral', 'Negativa'], {
  error:
    "La emoción/Customer Happiness debe ser una de: 'Positiva', 'Neutral' o 'Negativa'.",
});

/**
 * Perfil de usuario asociado al Journey Map.
 */
export const UserProfileSchema = z.object({
  id: z
    .string({ error: 'El ID del perfil de usuario es obligatorio.' })
    .min(1, 'El ID del perfil de usuario no puede estar vacío.'),
  nombre: z
    .string({ error: 'El nombre del perfil de usuario es obligatorio.' })
    .min(2, 'El nombre del perfil de usuario debe tener al menos 2 caracteres.'),
  rol: z
    .string({ error: 'El rol del perfil de usuario es obligatorio.' })
    .min(2, 'El rol del perfil de usuario debe tener al menos 2 caracteres.'),
});

/**
 * Fase o etapa del recorrido de la persona usuaria.
 */
export const PhaseSchema = z.object({
  nombre: z
    .string({ error: 'El nombre de la fase es obligatorio.' })
    .min(1, 'El nombre de la fase no puede estar vacío.'),

  actividades: z
    .array(
      z.string().min(1, 'Cada actividad debe ser un texto no vacío.'),
      {
        error: 'Las actividades deben ser un arreglo de textos.',
      },
    )
    .default([]),

  touchpoints: z
    .array(
      z.string().min(1, 'Cada punto de contacto debe ser un texto no vacío.'),
      {
        error: 'Los puntos de contacto deben ser un arreglo de textos.',
      },
    )
    .default([]),

  pensamientos: z
    .array(
      z.string().min(1, 'Cada pensamiento debe ser un texto no vacío.'),
      {
        error: 'Los pensamientos deben ser un arreglo de textos.',
      },
    )
    .default([]),

  emocion: HappinessEnum,

  dificultades: z
    .array(
      z.string().min(1, 'Cada dificultad debe ser un texto no vacío.'),
      {
        error: 'Las dificultades deben ser un arreglo de textos.',
      },
    )
    .default([]),

  ganancias: z
    .array(
      z.string().min(1, 'Cada ganancia debe ser un texto no vacío.'),
      {
        error: 'Las ganancias deben ser un arreglo de textos.',
      },
    )
    .default([]),

  oportunidades: z
    .array(
      z.string().min(1, 'Cada oportunidad debe ser un texto no vacío.'),
      {
        error: 'Las oportunidades deben ser un arreglo de textos.',
      },
    )
    .default([]),
});

export const JourneyMapSchema = z.object({
  perfilUsuario: UserProfileSchema,

  objetivo: z
    .string()
    .max(1500, 'El objetivo no puede superar los 1500 caracteres.')
    .optional(),

  eventoInicio: z
    .string()
    .max(1500, 'El evento de inicio no puede superar los 1500 caracteres.')
    .optional(),

  fases: z
    .array(PhaseSchema, {
      error:
        'Las fases cronológicas del Journey Map deben ser un arreglo.',
    })
    .min(3, 'El Journey Map debe contener al menos 3 fases cronológicas.'),

  evidencia: z
    .array(z.string().min(1, 'Cada evidencia debe ser un texto no vacío.'))
    .default([]),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type JourneyMap = z.infer<typeof JourneyMapSchema>;
