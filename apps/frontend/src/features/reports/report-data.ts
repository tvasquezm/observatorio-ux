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
    { id: 'resultados', label: 'Resultados detallados' },
    { id: 'agrupaciones', label: 'Agrupaciones sugeridas' },
  ] },
  { id: 'heuristica', label: 'Evaluación Heurística', detail: 'Problemas acordados, severidad y recomendaciones', partes: [
    { id: 'severidad', label: 'Resumen por severidad' },
    { id: 'problemas', label: 'Detalle de cada problema' },
  ] },
] as const;
export type ReportMethod = typeof REPORT_METHODS[number]['id'];
export type ReportParts = Partial<Record<ReportMethod, string[]>>;

async function loadCards(projectId: string) {
  const studies = await getCardSortingEstudiosByProyecto(projectId);
  const user = useAuthStore.getState().user;
  const results = [];
  // Evita una ráfaga de peticiones cuando el proyecto tiene muchos estudios.
  for (const study of studies.filter((study) => user?.rol === 'ADMIN' || study.evaluadorId === user?.id)) {
    results.push({ study, analytics: await getCardSortingAnalytics(study.id) });
  }
  return results;
}

export async function loadProjectReport(projectId: string, selection: readonly ReportMethod[], partes: ReportParts = {}) {
  const partesIncluidas: ReportParts = {};
  for (const { id, partes: opciones } of REPORT_METHODS) {
    if (!selection.includes(id)) continue;
    const elegidas = opciones.map(parte => parte.id).filter(parte => partes[id]?.includes(parte) ?? true);
    if (elegidas.length) partesIncluidas[id] = elegidas;
  }
  const methods = REPORT_METHODS.filter(({ id }) => partesIncluidas[id] !== undefined);
  if (!projectId || !methods.length) throw new Error('Selecciona un proyecto y al menos una técnica.');
  const includes = (id: ReportMethod) => methods.some((method) => method.id === id);
  const [project, personas, journeys, moments, cards, heuristics] = await Promise.all([
    getProject(projectId),
    includes('personas') ? listPersonas(projectId) : undefined,
    includes('journey') ? listJourneys(projectId) : undefined,
    includes('momentos') ? listCriticalMoments(projectId) : undefined,
    includes('cards') ? loadCards(projectId) : undefined,
    includes('heuristica') ? listarEvaluaciones(projectId).then(evaluacionesVigentes) : undefined,
  ]);
  // No se descarga un informe parcial si falla alguna de las técnicas elegidas.
  return { project, methods, partes: partesIncluidas, personas, journeys, moments, cards, heuristics, generatedAt: new Date() };
}

export type ProjectReport = Awaited<ReturnType<typeof loadProjectReport>>;
