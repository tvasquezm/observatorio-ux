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
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useActivePerspective } from '../shared/auth/useActivePerspective';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { useSala } from '../features/salas/hooks/useSalasQueries';
import { PanelAlertas, PanelAporte, PanelAvance, PanelHallazgos, PanelNovedades, desdeNovedades, useDatosDocente, useNovedadesLeidas } from '../features/analitica-proyecto/ResumenDocente';
import { Link } from 'react-router-dom';
import { acotarATecnicas, alertasRevision, aporteIntegrantes, avanceTecnicas, hallazgosClave, nombresTecnicas, novedadesDesde, tecnicasHabilitadas, type DatosDocente } from '../features/analitica-proyecto/resumen-docente';

export function AnalyticsPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const { data, isLoading, error } = useAnaliticaHeuristica(proyectoId);
  const personasQuery = usePersonas(proyectoId);
  const journeysQuery = useJourneys(proyectoId);
  const momentsQuery = useCriticalMoments(proyectoId);
  const cardSortingQuery = useCardSortingEstudiosByProyecto(proyectoId);
  const evaluacionesQuery = useEvaluacionesProyecto(proyectoId);
  const proyecto = useProject(proyectoId);
  const rol = useActivePerspective();
  // Las técnicas que se analizan las define el docente en la sala y valen para todos sus proyectos.
  const sala = useSala(proyecto.data?.salaId ?? null);
  const habilitadas = tecnicasHabilitadas(sala.data?.tecnicasAnalizadas);
  const puedeConfigurar = (rol === 'DOCENTE' || rol === 'ADMIN') && !!proyecto.data?.salaId;
  const evaluaciones = evaluacionesQuery.data ?? [];
  const usuarioId = useAuthStore((s) => s.user?.id ?? '');
  const docente = useDatosDocente(proyectoId);
  const novedades = useNovedadesLeidas(usuarioId, proyectoId);
  const isLoadingAll = isLoading || docente.isLoading || personasQuery.isLoading || journeysQuery.isLoading || momentsQuery.isLoading || cardSortingQuery.isLoading;
  const aggregateError = error ?? personasQuery.error ?? journeysQuery.error ?? momentsQuery.error ?? cardSortingQuery.error;

  const evidence = [
    { id: 'personas', label: 'Personas', count: personasQuery.data?.length ?? 0 },
    { id: 'journey-map', label: 'Journey maps', count: journeysQuery.data?.length ?? 0 },
    { id: 'momentos-criticos', label: 'Momentos críticos', count: momentsQuery.data?.length ?? 0 },
    { id: 'card-sorting', label: 'Card sorting', count: cardSortingQuery.data?.length ?? 0 },
    { id: 'evaluacion-heuristica', label: 'Evaluación heurística', count: data?.sesionesTotal ?? 0 },
  ].filter((item) => (habilitadas as string[]).includes(item.id));
  const methodsWithEvidence = evidence.filter((item) => item.count > 0).length;
  const participantResponses = cardSortingQuery.data?.reduce(
    (total, study) => total + (study.respuestasCount ?? 0),
    0,
  ) ?? 0;

  const datosDocente: DatosDocente = acotarATecnicas({
    personas: personasQuery.data ?? [], journeys: journeysQuery.data ?? [], momentos: momentsQuery.data ?? [],
    estudios: cardSortingQuery.data ?? [], evaluaciones,
    versiones: docente.versiones, miembros: docente.miembros, comentarios: docente.comentarios, eventosMiembros: docente.eventosMiembros,
  }, habilitadas);
  const aportes = aporteIntegrantes(datosDocente);

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">LECTURA TRANSVERSAL</span>
          <h2>Analítica general</h2>
          <p>Resumen para revisar el proyecto: avance del equipo, alertas, aportes, hallazgos clave y novedades.</p>
          {habilitadas.length < 5 && <p role="note" className="text-muted-sm">Se analizan {habilitadas.length} técnicas: {nombresTecnicas(habilitadas)}. Se definen en la configuración de la sala{puedeConfigurar && proyecto.data?.salaId ? <> (<Link to={`/salas/${proyecto.data.salaId}`}>cambiar en la sala</Link>)</> : ''}.</p>}
        </div>
      </div>

      {isLoadingAll && <Skeleton etiqueta="Calculando evidencia del proyecto…" variante="tarjetas" cantidad={4} />}
      {aggregateError && <p className="error-text" role="alert">{(aggregateError as Error).message}</p>}

      {data && !isLoadingAll && !aggregateError && (
        <>
          <section className="analytics-kpis">
            <article className="analytics-kpi">
              <span>MÉTODOS CON EVIDENCIA</span>
              <strong>{methodsWithEvidence}/{habilitadas.length}</strong>
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
            {habilitadas.includes('evaluacion-heuristica') && <article className="analytics-kpi">
              <span>HALLAZGOS HEURÍSTICOS</span>
              <strong>{data.hallazgosTotal}</strong>
              <small>{(data.porSeveridad[3]?.count ?? 0) + (data.porSeveridad[4]?.count ?? 0)} de prioridad alta</small>
            </article>}
          </section>
          <div className="docente-grid">
            <PanelAvance proyectoId={proyectoId} avance={avanceTecnicas(datosDocente).filter(a => habilitadas.includes(a.id))} />
            <PanelHallazgos proyectoId={proyectoId} hallazgos={hallazgosClave(datosDocente).filter(h => habilitadas.includes(h.ruta))} />
          </div>
          <PanelAlertas proyectoId={proyectoId} alertas={alertasRevision(datosDocente, aportes).filter(a => a.ruta === 'miembros' || (habilitadas as string[]).includes(a.ruta))} />
          <PanelAporte aportes={aportes} />
          <PanelNovedades proyectoId={proyectoId} novedades={novedadesDesde(datosDocente, desdeNovedades(novedades.leidoHasta), usuarioId)} leidoHasta={novedades.leidoHasta} onLeido={novedades.marcarLeido} onMostrarDeNuevo={novedades.mostrarDeNuevo} datos={datosDocente} usuarioId={usuarioId} />
          <PanelTecnicas proyectoId={proyectoId} habilitadas={habilitadas} datos={{
            personas: personasQuery.data ?? [], journeys: journeysQuery.data ?? [], momentos: momentsQuery.data ?? [],
            estudios: cardSortingQuery.data ?? [], evaluaciones,
          }} />
        </>
      )}
    </div>
  );
}
