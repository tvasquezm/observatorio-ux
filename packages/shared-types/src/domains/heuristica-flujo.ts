// Contrato del flujo completo. Las evaluaciones antiguas mantienen su API.
export type FaseHeuristica = 'BORRADOR' | 'EN_EVALUACION' | 'PENDIENTE_CONSENSO' | 'CONSOLIDADA' | 'FINALIZADA';
export interface OrigenCriterio { metodologiaId: string; autor: string; fuente: string; version: string; tipo: string }
/** `escala` propia opcional: si falta, el criterio usa la escala de la metodología (ver `escalaDe`). */
export interface CriterioFlujo { id: string; nombre: string; descripcion: string; categoria: string; origen: OrigenCriterio; peso: number; escala?: EscalaFlujo }
/** `favorable` opcional: true = respuesta favorable (cumple), false = desfavorable, ausente = neutra. Solo se usa para clasificar; nunca se infiere. */
export interface NivelEscala { id: string; etiqueta: string; significado: string; valor?: number; favorable?: boolean }
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
  /** Enunciado de cada ítem, por `categoria`. Opcional: las evaluaciones guardadas sin él siguen válidas. */
  enunciados?: Record<string, string>;
}
/** Escala efectiva de un criterio: la propia si existe, si no la de la metodología. */
export function escalaDe(metodologia: Pick<MetodologiaFlujo, 'escala'>, criterio: Pick<CriterioFlujo, 'escala'>): EscalaFlujo {
  return criterio.escala ?? metodologia.escala;
}
export interface ConfiguracionFlujo {
  nombre: string;
  producto: { clave: string; nombre: string; version: string; url: string; dispositivo: string };
  objetivo: string; tareas: string; pantallas: string; exclusiones: string;
  metodologia: MetodologiaFlujo;
  evaluadorIds: string[]; lectorIds: string[];
}
export interface RespuestaCriterio { criterioId: string; valor: string | null; noAplica: boolean; motivo: string; notas: string; evidenciaIds?: string[] }
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
export interface AspectoPositivo { id: string; titulo: string; descripcion: string }
export interface MejoraAntesDespues { id: string; titulo: string; descripcion: string; antesIds: string[]; despuesIds: string[] }
export interface ConsensoFlujo {
  criterios: DecisionCriterio[]; hallazgos: DecisionHallazgo[]; aprobadoPor: string[]; positivos?: AspectoPositivo[]; conclusion?: string; mejoras?: MejoraAntesDespues[];
  /** Redactor único del acuerdo. Si falta, redacta el coordinador (ver `redactorDe`). */
  redactorId?: string;
  /** Voto de cada experto por el redactor: evaluadorId -> candidatoId. */
  votosRedactor?: Record<string, string>;
  /** Último pedido de cambios de cada experto (uno por persona). Se retira al confirmar. */
  pedidosCambios?: PedidoCambios[];
}
export interface PedidoCambios { evaluadorId: string; comentario: string; creadoEn: string }
/** Redactor vigente: el elegido o, si no hay, el coordinador. */
export function redactorDe(consenso: Pick<ConsensoFlujo, 'redactorId'>, coordinadorId: string): string {
  return consenso.redactorId ?? coordinadorId;
}
/** Candidato con mayoría simple estricta (más de la mitad de los expertos). Empate o votos faltantes sin mayoría: null (decide el coordinador). */
export function ganadorVotoRedactor(votos: Record<string, string>, evaluadorIds: string[]): string | null {
  const cuenta = new Map<string, number>();
  for (const id of evaluadorIds) { const v = votos[id]; if (v) cuenta.set(v, (cuenta.get(v) ?? 0) + 1); }
  for (const [candidato, n] of cuenta) if (n * 2 > evaluadorIds.length) return candidato;
  return null;
}
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
