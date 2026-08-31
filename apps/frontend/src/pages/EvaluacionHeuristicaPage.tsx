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
import type { HallazgoHeuristica } from '../features/evaluacion-heuristica/api/evaluacion-heuristica.api';

function hallazgoVacio(): HallazgoHeuristica {
  return { heuristicaId: '', descripcion: '', severidad: 2, evidencia: '', recomendacion: '' };
}

export function EvaluacionHeuristicaPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const [sesionId, setSesionId] = useState<string | null>(null);
  const { mutate: crearSesion, isPending: creando } = useCrearSesionHeuristica(proyectoId);
  const { data: sesion } = useSesionHeuristica(proyectoId, sesionId);
  const { mutate: registrar, isPending: guardando } = useRegistrarHallazgo(proyectoId);
  const { mutate: finalizar, isPending: finalizando } = useFinalizarSesionHeuristica(proyectoId);
  const [hallazgo, setHallazgo] = useState<HallazgoHeuristica>(hallazgoVacio());

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
      <div className="panel">
        <h2>Evaluación Heurística</h2>
        <button className="primary" onClick={iniciarSesion} disabled={creando}>
          {creando ? 'Abriendo sesión…' : 'Abrir nueva sesión de evaluación'}
        </button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Evaluación Heurística — sesión activa</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, maxWidth: 480, margin: '12px 0' }}>
        <input
          placeholder="Código de heurística (ej. H4) *"
          value={hallazgo.heuristicaId}
          onChange={(e) => setHallazgo({ ...hallazgo, heuristicaId: e.target.value })}
          required
          style={{ padding: 8 }}
        />
        <textarea
          placeholder="Descripción del problema"
          value={hallazgo.descripcion}
          onChange={(e) => setHallazgo({ ...hallazgo, descripcion: e.target.value })}
          style={{ padding: 8, minHeight: 60 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select
            value={hallazgo.severidad}
            onChange={(e) => setHallazgo({ ...hallazgo, severidad: Number(e.target.value) as HallazgoHeuristica['severidad'] })}
            style={{ padding: 8 }}
          >
            <option value={0}>0 — No es un problema</option>
            <option value={1}>1 — Cosmético</option>
            <option value={2}>2 — Menor</option>
            <option value={3}>3 — Mayor</option>
            <option value={4}>4 — Catastrófico</option>
          </select>
          <input
            placeholder="Evidencia (opcional)"
            value={hallazgo.evidencia ?? ''}
            onChange={(e) => setHallazgo({ ...hallazgo, evidencia: e.target.value })}
            style={{ padding: 8 }}
          />
        </div>
        <input
          placeholder="Recomendación"
          value={hallazgo.recomendacion ?? ''}
          onChange={(e) => setHallazgo({ ...hallazgo, recomendacion: e.target.value })}
          style={{ padding: 8 }}
        />
        <button type="submit" className="primary" disabled={guardando}>
          {guardando ? 'Guardando…' : '+ Agregar hallazgo'}
        </button>
      </form>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {sesion?.hallazgos.map((h, i) => (
          <div key={i} style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 8 }}>
            <b>{h.heuristicaId}</b> — severidad {h.severidad}
            {h.descripcion && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{h.descripcion}</p>}
          </div>
        ))}
      </div>

      {sesion?.estado !== 'COMPLETADO' && (
        <button onClick={() => finalizar(sesionId)} disabled={finalizando} className="primary">
          {finalizando ? 'Finalizando…' : 'Finalizar sesión'}
        </button>
      )}
      {sesion?.estado === 'COMPLETADO' && <p style={{ color: '#2F6846' }}>✓ Sesión finalizada.</p>}
    </div>
  );
}
