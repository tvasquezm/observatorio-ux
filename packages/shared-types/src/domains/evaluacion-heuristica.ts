// packages/shared-types/src/domains/evaluacion-heuristica.ts

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
export const EVIDENCIA_MAX_BYTES = 4 * 1024 * 1024;
export const EVIDENCIA_MAX_MB = EVIDENCIA_MAX_BYTES / (1024 * 1024);
export const EVIDENCIA_MAX_POR_SESION = 50;
