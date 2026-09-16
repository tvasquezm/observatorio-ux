// apps/frontend/src/pages/AnalyticsPage.tsx
//
// Analítica agregada del proyecto. A diferencia del mockup de referencia,
// NO incluye SUS score ni NPS: esas métricas no existen en el modelo de
// datos (no hay ninguna sesión de encuesta que las produzca). Lo que se
// muestra acá sale de GET /projects/:id/evaluacion-heuristica/analytics,
// calculado sobre hallazgos reales.

import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { useAnaliticaHeuristica } from '../features/evaluacion-heuristica/hooks/useEvaluacionHeuristicaQueries';
import { usePersonas } from '../features/persona/hooks/usePersonaQueries';
import { useJourneys } from '../features/journey-map/hooks/useJourneyMapQueries';
import { useCriticalMoments } from '../features/momentos-criticos/hooks/useMomentosCriticosQueries';
import { useCardSortingEstudiosByProyecto } from '../features/card-sorting/hooks/useCardSortingQueries';

const SEVERIDAD_LABEL: Record<number, string> = {
  0: 'No es un problema',
  1: 'Cosmético',
  2: 'Menor',
  3: 'Mayor',
  4: 'Catastrófico',
};
const SEVERIDAD_CLASS: Record<number, string> = {
  0: 'sev-cosmetic',
  1: 'sev-cosmetic',
  2: 'sev-minor',
  3: 'sev-major',
  4: 'sev-critical',
};

export function AnalyticsPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data, isLoading, error } = useAnaliticaHeuristica(proyectoId);
  const personasQuery = usePersonas(proyectoId);
  const journeysQuery = useJourneys(proyectoId);
  const momentsQuery = useCriticalMoments(proyectoId);
  const cardSortingQuery = useCardSortingEstudiosByProyecto(proyectoId);
  const isLoadingAll = isLoading || personasQuery.isLoading || journeysQuery.isLoading || momentsQuery.isLoading || cardSortingQuery.isLoading;
  const aggregateError = error ?? personasQuery.error ?? journeysQuery.error ?? momentsQuery.error ?? cardSortingQuery.error;

  const evidence = [
    { label: 'Personas', count: personasQuery.data?.length ?? 0 },
    { label: 'Journey maps', count: journeysQuery.data?.length ?? 0 },
    { label: 'Momentos críticos', count: momentsQuery.data?.length ?? 0 },
    { label: 'Card sorting', count: cardSortingQuery.data?.length ?? 0 },
    { label: 'Evaluación heurística', count: data?.sesionesTotal ?? 0 },
  ];
  const methodsWithEvidence = evidence.filter((item) => item.count > 0).length;
  const maxEvidenceCount = Math.max(1, ...evidence.map((item) => item.count));
  const participantResponses = cardSortingQuery.data?.reduce(
    (total, study) => total + (study.respuestasCount ?? 0),
    0,
  ) ?? 0;

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">LECTURA TRANSVERSAL</span>
          <h2>Analítica general</h2>
          <p>Lectura conjunta de artefactos, estudios, participantes y hallazgos registrados en este proyecto.</p>
        </div>
      </div>

      {isLoadingAll && <p role="status">Calculando evidencia del proyecto…</p>}
      {aggregateError && <p className="error-text" role="alert">{(aggregateError as Error).message}</p>}

      {data && !isLoadingAll && !aggregateError && (
        <>
          <section className="analytics-kpis">
            <article className="analytics-kpi">
              <span>MÉTODOS CON EVIDENCIA</span>
              <strong>{methodsWithEvidence}/5</strong>
              <small>cobertura metodológica</small>
            </article>
            <article className="analytics-kpi">
              <span>ARTEFACTOS</span>
              <strong>{evidence.slice(0, 3).reduce((sum, item) => sum + item.count, 0)}</strong>
              <small>personas, journeys y momentos</small>
            </article>
            <article className="analytics-kpi">
              <span>RESPUESTAS CARD SORTING</span>
              <strong>{participantResponses}</strong>
              <small>{cardSortingQuery.data?.length ?? 0} estudios creados</small>
            </article>
            <article className="analytics-kpi">
              <span>HALLAZGOS HEURÍSTICOS</span>
              <strong>{data.hallazgosTotal}</strong>
              <small>{(data.porSeveridad[3]?.count ?? 0) + (data.porSeveridad[4]?.count ?? 0)} de prioridad alta</small>
            </article>
          </section>

          <article className="panel analytics-coverage">
            <div className="panel-head">
              <div><span className="kicker">COBERTURA</span><h3>Evidencia por método</h3></div>
              <span className="count">{methodsWithEvidence} de 5 activos</span>
            </div>
            {evidence.map((item) => (
              <div className="coverage-row" key={item.label}>
                <span>{item.label}</span>
                <div aria-hidden="true"><i style={{ width: `${item.count / maxEvidenceCount * 100}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <span className="kicker">HALLAZGOS</span>
                <h3>Distribución por severidad</h3>
              </div>
              <span className="count">{data.hallazgosTotal} en total</span>
            </div>
            {data.porSeveridad
              .slice()
              .reverse()
              .map((s) => (
                <div key={s.severidad} className={`severity-row ${SEVERIDAD_CLASS[s.severidad]}`}>
                  <header>
                    <b>Nivel {s.severidad} · {SEVERIDAD_LABEL[s.severidad]}</b>
                    <span>{s.porcentaje}% ({s.count})</span>
                  </header>
                  <span><i style={{ width: `${s.porcentaje}%` }} /></span>
                </div>
              ))}
            {data.hallazgosTotal === 0 && (
              <p className="text-muted-sm">
                Todavía no hay hallazgos registrados en este proyecto.
              </p>
            )}
          </article>
        </>
      )}
    </div>
  );
}
