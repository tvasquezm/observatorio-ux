import { getProject } from '../projects/api/projects.api';
import { listPersonas } from '../persona/api/persona.api';
import { listJourneys } from '../journey-map/api/journey-map.api';
import { listCriticalMoments } from '../momentos-criticos/api/momentos-criticos.api';
import { getCardSortingEstudiosByProyecto, getCardSortingAnalytics } from '../card-sorting/api/card-sorting.api';
import { listarSesionesHeuristicas } from '../evaluacion-heuristica/api/evaluacion-heuristica.api';
import { useAuthStore } from '../auth/store/useAuthStore';

export const REPORT_METHODS = [
  { id: 'personas', label: 'Personas', detail: 'Perfiles, necesidades y objetivos' },
  { id: 'journey', label: 'Journey Map', detail: 'Fases, emociones y oportunidades' },
  { id: 'momentos', label: 'Momentos Críticos', detail: 'Incidentes, impacto y acciones sugeridas' },
  { id: 'cards', label: 'Card Sorting', detail: 'Estudios, categorías y resultados agregados' },
  { id: 'heuristica', label: 'Evaluación Heurística', detail: 'Hallazgos, severidad y recomendaciones' },
] as const;
export type ReportMethod = typeof REPORT_METHODS[number]['id'];

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

export async function loadProjectReport(projectId: string, selection: readonly ReportMethod[]) {
  const methods = REPORT_METHODS.filter(({ id }) => selection.includes(id));
  if (!projectId || !methods.length) throw new Error('Selecciona un proyecto y al menos una técnica.');
  const includes = (id: ReportMethod) => methods.some((method) => method.id === id);
  const [project, personas, journeys, moments, cards, heuristics] = await Promise.all([
    getProject(projectId),
    includes('personas') ? listPersonas(projectId) : undefined,
    includes('journey') ? listJourneys(projectId) : undefined,
    includes('momentos') ? listCriticalMoments(projectId) : undefined,
    includes('cards') ? loadCards(projectId) : undefined,
    includes('heuristica') ? listarSesionesHeuristicas(projectId) : undefined,
  ]);
  // No se descarga un informe parcial si falla alguna de las técnicas elegidas.
  return { project, methods, personas, journeys, moments, cards, heuristics, generatedAt: new Date() };
}

export type ProjectReport = Awaited<ReturnType<typeof loadProjectReport>>;
