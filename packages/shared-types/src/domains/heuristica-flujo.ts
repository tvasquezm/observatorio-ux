// Contrato del flujo completo. Las evaluaciones antiguas mantienen su API.
export type FaseHeuristica = 'BORRADOR' | 'EN_EVALUACION' | 'PENDIENTE_CONSENSO' | 'CONSOLIDADA' | 'FINALIZADA';
export interface OrigenCriterio { metodologiaId: string; autor: string; fuente: string; version: string; tipo: string }
export interface CriterioFlujo { id: string; nombre: string; descripcion: string; categoria: string; origen: OrigenCriterio; peso: number }
export interface NivelEscala { id: string; etiqueta: string; significado: string; valor?: number }
export interface EscalaFlujo {
  tipo: 'categorica' | 'ordinal' | 'numerica' | 'cualitativa';
  niveles: NivelEscala[];
  sentido: 'mayor_mejor' | 'menor_mejor' | 'sin_orden';
  fuente: string;
  formula?: 'media_ponderada';
}
export interface MetodologiaFlujo {
  id: string; nombre: string; autor: string; fuente: string; version: string; tipo: string; ambito: string;
  criterios: CriterioFlujo[]; escala: EscalaFlujo; protegida: boolean;
}
export interface ConfiguracionFlujo {
  nombre: string;
  producto: { clave: string; nombre: string; version: string; url: string; dispositivo: string };
  objetivo: string; tareas: string; pantallas: string; exclusiones: string;
  metodologia: MetodologiaFlujo;
  evaluadorIds: string[]; lectorIds: string[];
}
export interface RespuestaCriterio { criterioId: string; valor: string | null; noAplica: boolean; motivo: string; notas: string }
export interface HallazgoFlujo {
  id: string; criterioIds: string[]; titulo: string; pantalla: string; descripcion: string;
  recomendacion: string; severidad: 0 | 1 | 2 | 3 | 4; prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  notas: string; evidenciaIds: string[];
}
export interface TrabajoFlujo {
  evaluadorId: string; nombre: string; respuestas: RespuestaCriterio[]; hallazgos: HallazgoFlujo[];
  entregadoEn: string | null; guardadoEn: string | null;
}
export interface DecisionCriterio extends RespuestaCriterio { justificacion: string }
export interface DecisionHallazgo extends HallazgoFlujo { origenIds: string[]; decision: 'PENDIENTE' | 'ACEPTADO' | 'DESCARTADO'; justificacion: string }
export interface ConsensoFlujo { criterios: DecisionCriterio[]; hallazgos: DecisionHallazgo[]; aprobadoPor: string[] }
export type EstadoComparacion = 'SOLUCIONADO' | 'PERMANECE' | 'MEJORO' | 'EMPEORO' | 'NUEVO' | 'NO_VERIFICADO' | 'NO_COMPARABLE';
export interface VinculoComparacion { anteriorId: string | null; actualId: string | null; estado: EstadoComparacion; justificacion: string }
export interface ComparacionFlujo { previaId: string; compatible: boolean; motivos: string[]; vinculos: VinculoComparacion[]; confirmadoPor: string | null; confirmadoEn: string | null }
export interface InformeFlujo {
  version: number; configuracion: ConfiguracionFlujo; consenso: ConsensoFlujo; evaluadores: Array<{ id: string; nombre: string }>;
  iniciadoEn: string | null; consolidadoEn: string; finalizadoEn: string | null;
}
export interface EvaluacionFlujo {
  id: string; proyectoId: string; coordinadorId: string; revision: number; version: number; anteriorId: string | null;
  fase: FaseHeuristica; configuracion: ConfiguracionFlujo; trabajos: TrabajoFlujo[]; consenso: ConsensoFlujo;
  informe: InformeFlujo | null; comparacion: ComparacionFlujo | null;
  avanceEquipo?: Array<{ evaluadorId: string; nombre: string; entregadoEn: string | null; guardadoEn: string | null; evaluados: number; total: number }>;
  createdAt: string; updatedAt: string; iniciadoEn: string | null; consolidadoEn: string | null; finalizadoEn: string | null;
}
export interface MiembroEquipoFlujo { id: string; nombre: string; rol: string }
export interface AnotacionEvidencia {
  id: string; tipo: 'rectangulo' | 'circulo' | 'flecha' | 'destacado' | 'texto';
  x: number; y: number; x2: number; y2: number; color: string; texto: string;
}
export interface EvidenciaFlujo { id: string; revision: number; evaluacionId: string; autorId: string; mimeType: string; tamano: number; anotaciones: AnotacionEvidencia[]; createdAt: string }
