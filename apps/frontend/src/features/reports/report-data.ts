import { getProject } from '../projects/api/projects.api';
import { listPersonas } from '../persona/api/persona.api';
import { listJourneys } from '../journey-map/api/journey-map.api';
import { listCriticalMoments } from '../momentos-criticos/api/momentos-criticos.api';
import { getCardSortingEstudiosByProyecto, getCardSortingAnalytics } from '../card-sorting/api/card-sorting.api';
import { listarEvaluaciones } from '../heuristica-flujo/flujo.api';
import { evaluacionesVigentes } from '../heuristica-flujo/analitica';
import { useAuthStore } from '../auth/store/useAuthStore';

export const REPORT_METHODS = [
  { id: 'personas', label: 'Personas', detail: 'Perfiles, necesidades y objetivos', partes: [
    { id: 'visual', label: 'Tarjeta como en la página' },
    { id: 'perfil', label: 'Perfil y descripción' },
    { id: 'necesidades', label: 'Necesidades y comportamiento' },
    { id: 'validacion', label: 'Evidencia y validación' },
  ] },
  { id: 'journey', label: 'Journey Map', detail: 'Fases, emociones y oportunidades', partes: [
    { id: 'visual', label: 'Mapa como en la página' },
    { id: 'resumen', label: 'Objetivo y evento de inicio' },
    { id: 'fases', label: 'Tabla de fases' },
    { id: 'detalle', label: 'Detalle por fase' },
  ] },
  { id: 'momentos', label: 'Momentos Críticos', detail: 'Incidentes, impacto y acciones sugeridas', partes: [
    { id: 'tabla', label: 'Tabla de incidentes' },
    { id: 'detalle', label: 'Detalle de cada incidente' },
  ] },
  { id: 'cards', label: 'Card Sorting', detail: 'Estudios, categorías y resultados agregados', partes: [
    { id: 'resumen', label: 'Resumen del estudio' },
    { id: 'tarjetas', label: 'Tarjetas (con distribución)' },
    { id: 'categorias', label: 'Categorías' },
    { id: 'matriz', label: 'Matriz de ubicaciones (mapa de calor)' },
    { id: 'populares', label: 'Tarjetas populares (mapa de calor)' },
    { id: 'similitud', label: 'Similitud entre tarjetas (mapa de calor)' },
    { id: 'dendrograma', label: 'Dendrograma' },
    { id: 'participantes', label: 'Clasificación de cada participante' },
    { id: 'agrupaciones', label: 'Agrupaciones sugeridas' },
  ] },
  { id: 'heuristica', label: 'Evaluación Heurística', detail: 'Problemas acordados, severidad y recomendaciones', partes: [
    { id: 'severidad', label: 'Resumen por severidad' },
    { id: 'problemas', label: 'Detalle de cada problema' },
  ] },
] as const;
export type ReportMethod = typeof REPORT_METHODS[number]['id'];
export type ReportParts = Partial<Record<ReportMethod, string[]>>;
/** Lienzos elegidos por técnica (ids). Sin entrada = todos. */
export type ReportLienzos = Partial<Record<ReportMethod, string[]>>;
export interface Lienzo { id: string; nombre: string }

async function estudiosVisibles(projectId: string) {
  const studies = await getCardSortingEstudiosByProyecto(projectId);
  const user = useAuthStore.getState().user;
  return studies.filter((study) => user?.rol === 'ADMIN' || study.evaluadorId === user?.id);
}

/** Lienzos disponibles de cada técnica del proyecto, para elegir cuáles van al PDF. */
export async function listarLienzos(projectId: string): Promise<Record<ReportMethod, Lienzo[]>> {
  const [personas, journeys, moments, cards, heuristics] = await Promise.all([
    listPersonas(projectId), listJourneys(projectId), listCriticalMoments(projectId), estudiosVisibles(projectId),
    listarEvaluaciones(projectId).then(evaluacionesVigentes),
  ]);
  return {
    personas: personas.map(p => ({ id: p.artefactoLogicoId, nombre: p.contenido.nombreCompleto || 'Persona sin nombre' })),
    journey: journeys.map(j => ({ id: j.artefactoLogicoId, nombre: `Recorrido de ${j.contenido.perfilUsuario.nombre}` })),
    momentos: moments.map(m => ({ id: m.artefactoLogicoId, nombre: `Incidentes de ${m.contenido.perfilUsuario.nombre}` })),
    cards: cards.map(c => ({ id: c.id, nombre: c.nombre })),
    heuristica: heuristics.map(e => ({ id: e.id, nombre: e.configuracion.nombre || e.configuracion.producto.nombre })),
  };
}

async function loadCards(projectId: string, elegidos?: string[]) {
  const studies = (await estudiosVisibles(projectId)).filter(study => !elegidos || elegidos.includes(study.id));
  const results = [];
  // Evita una ráfaga de peticiones cuando el proyecto tiene muchos estudios.
  for (const study of studies) {
    results.push({ study, analytics: await getCardSortingAnalytics(study.id) });
  }
  return results;
}

/** Plantillas de un clic del diálogo de exportación. `partes` ausente = todos los apartados de esa técnica. */
export const PLANTILLAS_INFORME: ReadonlyArray<{ id: string; label: string; descripcion: string; selection: ReportMethod[]; partes: ReportParts }> = [
  { id: 'completo', label: 'Informe completo', descripcion: 'Todas las técnicas con todos sus apartados.', selection: ['personas', 'journey', 'momentos', 'cards', 'heuristica'], partes: {} },
  {
    id: 'ejecutivo', label: 'Resumen ejecutivo', descripcion: 'Gráficos, resúmenes y hallazgos por severidad, sin el detalle.',
    selection: ['personas', 'journey', 'momentos', 'cards', 'heuristica'],
    partes: { personas: ['visual'], journey: ['visual', 'resumen'], momentos: ['tabla'], cards: ['resumen', 'tarjetas', 'similitud', 'dendrograma', 'agrupaciones'], heuristica: ['severidad'] },
  },
  { id: 'hallazgos', label: 'Solo hallazgos', descripcion: 'Problemas de la evaluación heurística e incidentes críticos.', selection: ['momentos', 'heuristica'], partes: {} },
];

/** Apartados que ya no existen -> sus reemplazos, para que una elección guardada siga valiendo. */
const PARTES_ANTIGUAS: Partial<Record<ReportMethod, Record<string, string[]>>> = {
  cards: { resultados: ['tarjetas', 'categorias'] },
};
export function normalizarPartes(metodo: ReportMethod, partes?: string[]): string[] | undefined {
  const antiguas = PARTES_ANTIGUAS[metodo];
  return partes && antiguas ? [...new Set(partes.flatMap(p => antiguas[p] ?? [p]))] : partes;
}

export async function loadProjectReport(projectId: string, selection: readonly ReportMethod[], partes: ReportParts = {}, lienzos: ReportLienzos = {}) {
  const partesIncluidas: ReportParts = {};
  for (const { id, partes: opciones } of REPORT_METHODS) {
    if (!selection.includes(id)) continue;
    const pedidas = normalizarPartes(id, partes[id]);
    const elegidas = opciones.map(parte => parte.id).filter(parte => pedidas?.includes(parte) ?? true);
    if (elegidas.length) partesIncluidas[id] = elegidas;
  }
  const methods = REPORT_METHODS.filter(({ id }) => partesIncluidas[id] !== undefined);
  if (!projectId || !methods.length) throw new Error('Selecciona un proyecto y al menos una técnica.');
  const includes = (id: ReportMethod) => methods.some((method) => method.id === id);
  const elegido = (metodo: ReportMethod) => (id: string) => !lienzos[metodo] || lienzos[metodo]!.includes(id);
  const [project, personas, journeys, moments, cards, heuristics] = await Promise.all([
    getProject(projectId),
    includes('personas') ? listPersonas(projectId).then(l => l.filter(a => elegido('personas')(a.artefactoLogicoId))) : undefined,
    includes('journey') ? listJourneys(projectId).then(l => l.filter(a => elegido('journey')(a.artefactoLogicoId))) : undefined,
    includes('momentos') ? listCriticalMoments(projectId).then(l => l.filter(a => elegido('momentos')(a.artefactoLogicoId))) : undefined,
    includes('cards') ? loadCards(projectId, lienzos.cards) : undefined,
    includes('heuristica') ? listarEvaluaciones(projectId).then(evaluacionesVigentes).then(l => l.filter(e => elegido('heuristica')(e.id))) : undefined,
  ]);
  // No se descarga un informe parcial si falla alguna de las técnicas elegidas.
  return { project, methods, partes: partesIncluidas, personas, journeys, moments, cards, heuristics, generatedAt: new Date() };
}

export type ProjectReport = Awaited<ReturnType<typeof loadProjectReport>>;
