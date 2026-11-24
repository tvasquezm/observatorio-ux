// apps/frontend/src/pages/AnalyticsPage.tsx
//
// Analítica agregada del proyecto. A diferencia del mockup de referencia,
// NO incluye SUS score ni NPS: esas métricas no existen en el modelo de
// datos. Reúne lo importante de las cinco técnicas (personas, journey maps,
// momentos críticos, card sorting y evaluación heurística); de la heurística
// solo cuentan los problemas acordados de la versión más reciente.

import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import { useAnaliticaHeuristica } from '../features/heuristica-flujo/useAnaliticaHeuristica';
import { usePersonas } from '../features/persona/hooks/usePersonaQueries';
import { useJourneys } from '../features/journey-map/hooks/useJourneyMapQueries';
import { useCriticalMoments } from '../features/momentos-criticos/hooks/useMomentosCriticosQueries';
import { useCardSortingEstudiosByProyecto } from '../features/card-sorting/hooks/useCardSortingQueries';
import { PanelTecnicas, useEvaluacionesProyecto } from '../features/analitica-proyecto/AnaliticaDecision';
import { Skeleton } from '../shared/components/ui/Skeleton';

export function AnalyticsPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data, isLoading, error } = useAnaliticaHeuristica(proyectoId);
  const personasQuery = usePersonas(proyectoId);
  const journeysQuery = useJourneys(proyectoId);
  const momentsQuery = useCriticalMoments(proyectoId);
  const cardSortingQuery = useCardSortingEstudiosByProyecto(proyectoId);
  const evaluacionesQuery = useEvaluacionesProyecto(proyectoId);
  const evaluaciones = evaluacionesQuery.data ?? [];
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
          <p>Lectura conjunta de artefactos, card sorting, participantes y hallazgos registrados en este proyecto.</p>
        </div>
      </div>

      {isLoadingAll && <Skeleton etiqueta="Calculando evidencia del proyecto…" variante="tarjetas" cantidad={4} />}
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
              <small>{cardSortingQuery.data?.length ?? 0} card sorting creados</small>
            </article>
            <article className="analytics-kpi">
              <span>HALLAZGOS HEURÍSTICOS</span>
              <strong>{data.hallazgosTotal}</strong>
              <small>{(data.porSeveridad[3]?.count ?? 0) + (data.porSeveridad[4]?.count ?? 0)} de prioridad alta</small>
            </article>
          </section>
          <PanelTecnicas proyectoId={proyectoId} datos={{
            personas: personasQuery.data ?? [], journeys: journeysQuery.data ?? [], momentos: momentsQuery.data ?? [],
            estudios: cardSortingQuery.data ?? [], evaluaciones,
          }} />
        </>
      )}
    </div>
  );
}
