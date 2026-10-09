import type { EvaluacionHeuristicaSesion } from '../api/evaluacion-heuristica.api';
import { nombreSesion } from '../heuristica-utils';

interface Props {
  sesiones: EvaluacionHeuristicaSesion[];
  onAbrir: (sesionId: string) => void;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export function SesionesHeuristicas({ sesiones, onAbrir }: Props) {
  if (sesiones.length === 0) {
    return <p className="text-muted-xs">Todavía no hay evaluaciones en este proyecto.</p>;
  }
  const recientes = [...sesiones].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <ul className="hx-sessions" aria-label="Evaluaciones del proyecto">
      {recientes.map((s) => {
        const abierta = s.estado === 'EN_PROGRESO';
        return (
          <li key={s.id} className="hx-session">
            <div>
              <strong>{nombreSesion(s)}</strong>
              <span className="text-muted-xs">
                {fecha(s.createdAt)} · {s.resultado?.length ?? 0} hallazgos
              </span>
            </div>
            <span className={`badge ${abierta ? 'hx-estado-open' : 'hx-estado-done'}`}>
              {abierta ? 'En progreso' : 'Finalizada'}
            </span>
            <button type="button" className="secondary" onClick={() => onAbrir(s.id)}>
              {abierta ? 'Continuar' : 'Ver'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
