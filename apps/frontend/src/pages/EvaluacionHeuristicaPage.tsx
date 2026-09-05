// apps/frontend/src/pages/EvaluacionHeuristicaPage.tsx

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ProjectOutletContext } from '../layouts/ProjectDetailLayout';
import {
  useCrearSesionHeuristica,
  useFinalizarSesionHeuristica,
  useRegistrarHallazgo,
  useSesionHeuristica,
} from '../features/evaluacion-heuristica/hooks/useEvaluacionHeuristicaQueries';
import type { HallazgoHeuristicaInput } from '../features/evaluacion-heuristica/api/evaluacion-heuristica.api';

function hallazgoVacio(): HallazgoHeuristicaInput {
  return { heuristicaId: '', descripcion: '', severidad: 2, evidencia: '', recomendacion: '' };
}

// Mapea la severidad numérica (0-4, definida en el backend) a la etiqueta y
// clase de badge visual. 0 ("No es un problema") comparte estilo con
// "Cosmético" — ambas son de bajo impacto, no ameritan una 5ta variante.
const SEVERIDAD_INFO: Record<number, { label: string; badgeClass: string }> = {
  0: { label: 'No es un problema', badgeClass: 'cosmetic' },
  1: { label: 'Cosmético', badgeClass: 'cosmetic' },
  2: { label: 'Menor', badgeClass: 'minor' },
  3: { label: 'Mayor', badgeClass: 'major' },
  4: { label: 'Catastrófico', badgeClass: 'critical' },
};

export function EvaluacionHeuristicaPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const [sesionId, setSesionId] = useState<string | null>(null);
  const { mutate: crearSesion, isPending: creando } = useCrearSesionHeuristica(proyectoId);
  const { data: sesion } = useSesionHeuristica(proyectoId, sesionId);
  const { mutate: registrar, isPending: guardando } = useRegistrarHallazgo(proyectoId);
  const { mutate: finalizar, isPending: finalizando } = useFinalizarSesionHeuristica(proyectoId);
  const [hallazgo, setHallazgo] = useState<HallazgoHeuristicaInput>(hallazgoVacio());

  function iniciarSesion() {
    crearSesion(undefined, { onSuccess: (s) => setSesionId(s.id) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sesionId || !hallazgo.heuristicaId.trim()) return;
    registrar({ sesionId, hallazgo }, { onSuccess: () => setHallazgo(hallazgoVacio()) });
  }

  if (!sesionId) {
    return (
      <div className="fade">
        <div className="page-head">
          <div>
            <span className="kicker">EVALUACIÓN HEURÍSTICA</span>
            <h1>Hallazgos heurísticos</h1>
            <p>Registra problemas de usabilidad con evidencia, severidad y una recomendación accionable.</p>
          </div>
        </div>
        <div className="panel">
          <button className="primary" onClick={iniciarSesion} disabled={creando}>
            {creando ? 'Abriendo sesión…' : 'Abrir nueva sesión de evaluación'}
          </button>
        </div>
      </div>
    );
  }

  const validados = sesion?.resultado.filter((h) => h.severidad <= 1).length ?? 0;

  return (
    <div className="fade">
      <div className="page-head">
        <div>
          <span className="kicker">EVALUACIÓN HEURÍSTICA · SESIÓN ACTIVA</span>
          <h1>Hallazgos heurísticos</h1>
          <p>Registra problemas de usabilidad con evidencia, severidad y una recomendación accionable.</p>
        </div>
      </div>

      <div className="panel mb-16">
        <form onSubmit={handleSubmit} className="form-grid" style={{ maxWidth: 520 }}>
          <input
            placeholder="Código de heurística (ej. H4) *"
            value={hallazgo.heuristicaId}
            onChange={(e) => setHallazgo({ ...hallazgo, heuristicaId: e.target.value })}
            required
            className="input-sm"
          />
          <textarea
            placeholder="Descripción del problema"
            value={hallazgo.descripcion}
            onChange={(e) => setHallazgo({ ...hallazgo, descripcion: e.target.value })}
            className="textarea-sm"
          />
          <div className="form-grid-2">
            <select
              value={hallazgo.severidad}
              onChange={(e) => setHallazgo({ ...hallazgo, severidad: Number(e.target.value) as HallazgoHeuristicaInput['severidad'] })}
              className="input-sm"
            >
              {Object.entries(SEVERIDAD_INFO).map(([valor, info]) => (
                <option key={valor} value={valor}>{valor} — {info.label}</option>
              ))}
            </select>
            <input
              placeholder="Evidencia (opcional)"
              value={hallazgo.evidencia ?? ''}
              onChange={(e) => setHallazgo({ ...hallazgo, evidencia: e.target.value })}
              className="input-sm"
            />
          </div>
          <input
            placeholder="Recomendación"
            value={hallazgo.recomendacion ?? ''}
            onChange={(e) => setHallazgo({ ...hallazgo, recomendacion: e.target.value })}
            className="input-sm"
          />
          <button type="submit" className="primary btn-start" disabled={guardando}>
            {guardando ? 'Guardando…' : '+ Agregar hallazgo'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <span className="kicker">ANALÍTICA ESPECÍFICA</span>
            <h2>Hallazgos registrados</h2>
          </div>
          <span className="count">{validados}/{sesion?.resultado.length ?? 0} de baja severidad</span>
        </div>

        {sesion?.resultado.length === 0 && (
          <p className="text-muted" style={{ fontSize: 11 }}>Todavía no hay hallazgos registrados en esta sesión.</p>
        )}

        {sesion?.resultado.map((h) => {
          const info = SEVERIDAD_INFO[h.severidad];
          return (
            <article key={h.id} className="finding rise">
              <div className="finding-head">
                <span className={`badge ${info.badgeClass}`}>{info.label}</span>
                <span className="kicker">{h.heuristicaId}</span>
              </div>
              {h.descripcion && <h3>{h.descripcion}</h3>}
              <div className="finding-grid">
                <p><b>Evidencia</b>{h.evidencia || '—'}</p>
                <p><b>Recomendación</b>{h.recomendacion || '—'}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-16">
        {sesion?.estado !== 'COMPLETADO' && (
          <button onClick={() => finalizar(sesionId)} disabled={finalizando} className="primary">
            {finalizando ? 'Finalizando…' : 'Finalizar sesión'}
          </button>
        )}
        {sesion?.estado === 'COMPLETADO' && <p className="text-success">✓ Sesión finalizada.</p>}
      </div>
    </div>
  );
}
