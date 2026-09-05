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

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">LECTURA TRANSVERSAL</span>
          <h1>Analítica general</h1>
          <p>Distribución real de severidad sobre todos los hallazgos heurísticos registrados en este proyecto.</p>
        </div>
      </div>

      {isLoading && <p>Cargando…</p>}
      {error && <p style={{ color: 'var(--coral)' }}>{(error as Error).message}</p>}

      {data && (
        <>
          <section className="analytics-kpis">
            <article className="analytics-kpi">
              <span>SESIONES DE EVALUACIÓN</span>
              <strong>{data.sesionesTotal}</strong>
              <small>{data.sesionesCompletadas} completadas</small>
            </article>
            <article className="analytics-kpi">
              <span>TOTAL HALLAZGOS</span>
              <strong>{data.hallazgosTotal}</strong>
              <small>{data.porSeveridad[4]?.count ?? 0} catastróficos</small>
            </article>
            <article className="analytics-kpi">
              <span>MAYORES + CATASTRÓFICOS</span>
              <strong>{(data.porSeveridad[3]?.count ?? 0) + (data.porSeveridad[4]?.count ?? 0)}</strong>
              <small>prioridad alta</small>
            </article>
            <article className="analytics-kpi">
              <span>SEVERIDAD PROMEDIO</span>
              <strong>
                {data.hallazgosTotal > 0
                  ? (
                      data.porSeveridad.reduce((acc, s) => acc + s.severidad * s.count, 0) /
                      data.hallazgosTotal
                    ).toFixed(1)
                  : '—'}
              </strong>
              <small>escala 0-4</small>
            </article>
          </section>

          <article className="panel">
            <div className="panel-head">
              <div>
                <span className="kicker">HALLAZGOS</span>
                <h2>Distribución por severidad</h2>
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
              <p style={{ color: 'var(--muted)', fontSize: 12 }}>
                Todavía no hay hallazgos registrados en este proyecto.
              </p>
            )}
          </article>
        </>
      )}
    </div>
  );
}
