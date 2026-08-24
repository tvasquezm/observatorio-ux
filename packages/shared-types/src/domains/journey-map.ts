import { z } from 'zod';

/**
 * Nivel de Customer Happiness / emoción percibida en una fase del Journey Map.
 * Es un campo obligatorio por requerimiento metodológico.
 *
 * Nota: sintaxis Zod v4 — `errorMap` fue reemplazado por `error`.
 */
export const HappinessEnum = z.enum(['Positiva', 'Neutral', 'Negativa'], {
  error: "La emoción/Customer Happiness debe ser una de: 'Positiva', 'Neutral' o 'Negativa'.",
});

/**
 * Perfil de usuario (persona/buyer persona) asociado al Journey Map.
 *
 * Nota: en Zod v4, `required_error`/`invalid_type_error` se unificaron
 * en la opción `error`, que cubre tanto el caso "falta el campo" como
 * "el tipo es incorrecto".
 */
export const UserProfileSchema = z.object({
  id: z
    .string({ error: 'El ID del perfil de usuario es obligatorio y debe ser texto.' })
    .min(1, 'El ID del perfil de usuario no puede estar vacío.'),
  nombre: z
    .string({ error: 'El nombre del perfil de usuario es obligatorio y debe ser texto.' })
    .min(2, 'El nombre del perfil de usuario debe tener al menos 2 caracteres.'),
  rol: z
    .string({ error: 'El rol del perfil de usuario es obligatorio y debe ser texto.' })
    .min(2, 'El rol del perfil de usuario debe tener al menos 2 caracteres.'),
});

/**
 * Fase o etapa cronológica del Journey Map.
 */
export const PhaseSchema = z.object({
  nombre: z
    .string({ error: 'El nombre de la fase es obligatorio y debe ser texto.' })
    .min(1, 'El nombre de la fase no puede estar vacío.'),

  touchpoints: z
    .array(z.string().min(1, 'Cada punto de contacto (touchpoint) debe ser un texto no vacío.'), {
      error: 'Los puntos de contacto (touchpoints) son obligatorios en cada fase.',
    })
    .min(1, 'Debe existir al menos un punto de contacto (touchpoint) por fase.'),

  pensamientos: z
    .array(z.string().min(1, 'Cada pensamiento debe ser un texto no vacío.'), {
      error: 'Los pensamientos del usuario son obligatorios en cada fase.',
    })
    .min(1, 'Debe existir al menos un pensamiento registrado por fase.'),

  emocion: HappinessEnum,

  oportunidades: z
    .array(z.string().min(1, 'Cada oportunidad de mejora debe ser un texto no vacío.'), {
      error: 'Las oportunidades de mejora son obligatorias en cada fase.',
    })
    .min(1, 'Debe existir al menos una oportunidad de mejora por fase.'),
});

/**
 * Esquema raíz del artefacto Journey Map.
 * Valida el contenido almacenado en UxArtifact.contenido cuando
 * tipo === TipoArtefacto.JOURNEY_MAP.
 */
export const JourneyMapSchema = z.object({
  perfilUsuario: UserProfileSchema,

  fases: z
    .array(PhaseSchema, {
      error: 'Las fases cronológicas del Journey Map son obligatorias y deben ser un arreglo.',
    })
    .min(3, 'El Journey Map debe contener al menos 3 fases cronológicas.'),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type JourneyMap = z.infer<typeof JourneyMapSchema>;