import { useState } from 'react';
import { TECNICAS_PROYECTO } from '@observatorio-ux/shared-types';
import { useUpdateProject } from '../projects/hooks/useProjectsQueries';
import { TECNICAS, type RutaTecnica } from './resumen-docente';

/** Lista legible de las técnicas elegidas ("Personas, Card Sorting y Evaluación heurística"). */
export const nombresTecnicas = (ids: readonly RutaTecnica[]) => {
  const t = TECNICAS.filter(x => ids.includes(x.id)).map(x => x.titulo);
  return t.length > 1 ? `${t.slice(0, -1).join(', ')} y ${t.at(-1)}` : t.join('');
};

/** El docente elige qué técnicas se analizan en el proyecto; el resto no cuenta ni genera alertas. */
export function ConfigTecnicas({ proyectoId, habilitadas }: { proyectoId: string; habilitadas: readonly RutaTecnica[] }) {
  const guardar = useUpdateProject();
  const [elegidas, setElegidas] = useState<RutaTecnica[]>([...habilitadas]);
  const cambio = elegidas.length !== habilitadas.length || elegidas.some(t => !habilitadas.includes(t));
  const alternar = (id: RutaTecnica) => setElegidas(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  return (
    <details className="panel analitica-config" open={habilitadas.length < TECNICAS_PROYECTO.length || undefined}>
      <summary>Técnicas que se analizan en este proyecto <span className="count">{habilitadas.length} de {TECNICAS_PROYECTO.length}</span></summary>
      <p className="text-muted-sm">Marca solo las técnicas que usará el equipo. Las demás se ocultan de esta analítica y no generan alertas ni cuentan como pendientes.</p>
      <fieldset className="analitica-config-lista">
        <legend className="sr-only">Técnicas a analizar</legend>
        {TECNICAS.map(t => (
          <label key={t.id} className="analitica-config-opcion">
            <input type="checkbox" checked={elegidas.includes(t.id)} onChange={() => alternar(t.id)} />
            <span>{t.titulo}</span>
          </label>
        ))}
      </fieldset>
      {!elegidas.length && <p role="alert" className="error-text">Elige al menos una técnica.</p>}
      <div className="analitica-config-acciones">
        <button type="button" className="primary" disabled={!cambio || !elegidas.length || guardar.isPending}
          onClick={() => guardar.mutate({ id: proyectoId, data: { tecnicasAnalizadas: TECNICAS.map(t => t.id).filter(id => elegidas.includes(id)) } })}>
          {guardar.isPending ? 'Guardando…' : 'Guardar técnicas'}
        </button>
        {guardar.isSuccess && !cambio && <span role="status" className="text-muted-sm">Guardado.</span>}
      </div>
    </details>
  );
}
