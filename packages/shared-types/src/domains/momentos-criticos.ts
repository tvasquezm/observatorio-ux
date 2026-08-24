import { z } from 'zod';
import { UserProfileSchema } from './journey-map';

// --- Enums del dominio ---

export const TipoIncidenteEnum = z.enum(['Positivo', 'Negativo'], {
  error: 'El tipo de incidente debe ser "Positivo" o "Negativo".',
});

export const ImpactoIncidenteEnum = z.enum(['Alto', 'Medio', 'Bajo'], {
  error: 'El impacto debe ser "Alto", "Medio" o "Bajo".',
});

export const FrecuenciaIncidenteEnum = z.enum(['Alta', 'Media', 'Baja'], {
  error: 'La frecuencia debe ser "Alta", "Media" o "Baja".',
});

// --- Esquema de un Incidente Crítico individual ---

export const IncidenteCriticoSchema = z.object({
  nombre: z
    .string({ error: 'El nombre del incidente es obligatorio y debe ser un texto.' })
    .min(1, 'El nombre del incidente no puede estar vacío.'),

  descripcion: z
    .string({ error: 'La descripción del incidente es obligatoria y debe ser un texto.' })
    .min(1, 'La descripción del incidente no puede estar vacía.'),

  tipo: TipoIncidenteEnum,

  impacto: ImpactoIncidenteEnum,

  frecuencia: FrecuenciaIncidenteEnum,

  causa: z
    .string({ error: 'La causa del incidente es obligatoria y debe ser un texto.' })
    .min(1, 'La causa del incidente no puede estar vacía.'),

  accionesSugeridas: z
    .array(
      z
        .string({ error: 'Cada acción sugerida debe ser un texto.' })
        .min(1, 'La acción sugerida no puede estar vacía.'),
      { error: 'Las acciones sugeridas deben proporcionarse como un arreglo de textos.' },
    )
    .min(1, 'Debes indicar al menos una acción sugerida para el incidente.'),
});

// --- Esquema raíz del artefacto MOMENTOS_CRITICOS ---

export const MomentosCriticosSchema = z.object({
  perfilUsuario: UserProfileSchema,

  incidentes: z
    .array(IncidenteCriticoSchema, {
      error: 'Los incidentes deben proporcionarse como un arreglo.',
    })
    .min(1, 'Debes registrar al menos un incidente crítico en la matriz.'),
});

// --- Tipos inferidos ---

export type TipoIncidente = z.infer<typeof TipoIncidenteEnum>;
export type ImpactoIncidente = z.infer<typeof ImpactoIncidenteEnum>;
export type FrecuenciaIncidente = z.infer<typeof FrecuenciaIncidenteEnum>;
export type IncidenteCritico = z.infer<typeof IncidenteCriticoSchema>;
export type MomentosCriticos = z.infer<typeof MomentosCriticosSchema>;