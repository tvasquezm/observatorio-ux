// packages/shared-types/src/domains/evaluacion-heuristica.ts
import { z } from 'zod';
import { BaseMetadataSchema, createBasePayloadSchema } from '../common/base-payload.schema';

// ---------------------------------------------------------------------------
// Catálogo: las 10 heurísticas de usabilidad de Nielsen. Única fuente de
// verdad para backend (validación) y frontend (selector, filtros, reporte).
// ---------------------------------------------------------------------------
export const HEURISTICA_IDS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10'] as const;
export type HeuristicaId = (typeof HEURISTICA_IDS)[number];

export interface HeuristicaNielsen {
  id: HeuristicaId;
  nombre: string;
  definicion: string;
}

export const HEURISTICAS_NIELSEN: readonly HeuristicaNielsen[] = [
  { id: 'H1', nombre: 'Visibilidad del estado del sistema', definicion: 'El sistema informa al usuario qué ocurre mediante retroalimentación oportuna.' },
  { id: 'H2', nombre: 'Coincidencia entre el sistema y el mundo real', definicion: 'Usa el lenguaje y los conceptos del usuario, no términos internos del sistema.' },
  { id: 'H3', nombre: 'Control y libertad del usuario', definicion: 'Permite deshacer, cancelar y salir fácilmente de acciones no deseadas.' },
  { id: 'H4', nombre: 'Consistencia y estándares', definicion: 'Elementos y acciones equivalentes se ven y comportan igual en toda la interfaz.' },
  { id: 'H5', nombre: 'Prevención de errores', definicion: 'Evita que el error ocurra: restricciones, valores por defecto y confirmaciones.' },
  { id: 'H6', nombre: 'Reconocimiento antes que recuerdo', definicion: 'Opciones y datos visibles; el usuario no debe memorizar información entre pantallas.' },
  { id: 'H7', nombre: 'Flexibilidad y eficiencia de uso', definicion: 'Atajos y personalización para usuarios expertos sin perjudicar a los novatos.' },
  { id: 'H8', nombre: 'Diseño estético y minimalista', definicion: 'Sin información irrelevante o redundante que compita con lo importante.' },
  { id: 'H9', nombre: 'Ayuda para reconocer, diagnosticar y recuperarse de errores', definicion: 'Mensajes claros, sin códigos, que indican el problema y proponen una solución.' },
  { id: 'H10', nombre: 'Ayuda y documentación', definicion: 'Ayuda breve, buscable y orientada a tareas, disponible cuando se necesita.' },
];

// ---------------------------------------------------------------------------
// Escala de severidad de Nielsen (0-4).
// ---------------------------------------------------------------------------
export type SeveridadValor = 0 | 1 | 2 | 3 | 4;

export interface SeveridadHeuristica {
  valor: SeveridadValor;
  etiqueta: string;
  descripcion: string;
}

export const SEVERIDADES: readonly SeveridadHeuristica[] = [
  { valor: 0, etiqueta: 'No es un problema', descripcion: 'No se considera un problema de usabilidad.' },
  { valor: 1, etiqueta: 'Cosmético', descripcion: 'Corregir solo si sobra tiempo.' },
  { valor: 2, etiqueta: 'Menor', descripcion: 'Baja prioridad de corrección.' },
  { valor: 3, etiqueta: 'Mayor', descripcion: 'Importante corregir; alta prioridad.' },
  { valor: 4, etiqueta: 'Catastrófico', descripcion: 'Imperativo corregir antes del lanzamiento.' },
];

// ---------------------------------------------------------------------------
// Límites de la evidencia (captura de pantalla) — compartidos con el frontend
// para validar antes de subir. El backend revalida siempre.
// ---------------------------------------------------------------------------
export const EVIDENCIA_MIME_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const EVIDENCIA_MAX_BYTES = 2 * 1024 * 1024;
export const EVIDENCIA_MAX_POR_SESION = 50;

// ---------------------------------------------------------------------------
// Hallazgo. `titulo`, `pantalla`, `evidenciaUrl`, `evidenciaArchivoId`,
// `responsable` y `actualizadoEn` pueden faltar en hallazgos legados.
// ---------------------------------------------------------------------------
export const ResponsableSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
});

export const HallazgoSchema = z.object({
  id: z.string().uuid(),
  heuristicaId: z.enum(HEURISTICA_IDS),
  severidad: z.number().int().min(0).max(4),
  titulo: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(120),
  pantalla: z.string().trim().min(1, 'Indica la pantalla o elemento evaluado').max(200),
  descripcion: z.string().trim().min(10, 'La descripción debe tener al menos 10 caracteres').max(2000),
  evidencia: z.string().trim().min(1, 'Describe la evidencia').max(1000),
  evidenciaUrl: z.string().url('Debe ser una URL válida').max(500).nullable().optional(),
  evidenciaArchivoId: z.string().uuid().nullable().optional(),
  recomendacion: z.string().trim().min(1, 'Propón una recomendación').max(1000),
  responsable: ResponsableSchema,
  registradoEn: z.string(),
  actualizadoEn: z.string().optional(),
});

export const EvaluacionHeuristicaPayloadSchema = z.object({
  hallazgos: z.array(HallazgoSchema),
});

// 1. Esquema Completo (Para la validación estricta en POST /finalizar)
export const EvaluacionHeuristicaSchema = createBasePayloadSchema(EvaluacionHeuristicaPayloadSchema);

// 2. Esquema Parcial (Para autoguardado en PATCH y React-Hook-Form)
//
// zod v4 eliminó `.deepPartial()` (existía en v3). Se arma a mano:
export const EvaluacionHeuristicaPartialSchema = BaseMetadataSchema.partial().extend({
  hallazgos: z.array(HallazgoSchema.partial()).optional(),
});

export type Responsable = z.infer<typeof ResponsableSchema>;
export type Hallazgo = z.infer<typeof HallazgoSchema>;
export type EvaluacionHeuristica = z.infer<typeof EvaluacionHeuristicaSchema>;
