// «Cambiar proyecto» dentro de un proyecto: abre el selector con búsqueda, acotado por defecto a la
// sala del proyecto actual, y lleva al elegido en la misma sección (Personas, Journey Map…).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjectsQueries';
import { useSalas } from '../../salas/hooks/useSalasQueries';
import { SelectorProyecto } from './SelectorProyecto';

interface Props {
  proyectoId: string;
  salaId?: string | null;
  usuarioId: string;
  /** Sección actual (primer tramo tras /proyectos/:id), para conservarla al cambiar. */
  seccion: string;
}

export function CambiarProyecto({ proyectoId, salaId, usuarioId, seccion }: Props) {
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const { data: proyectos } = useProjects();
  const { data: salas } = useSalas();
  if (!proyectos || proyectos.length < 2) return null;

  return (
    <div className="cambiar-proyecto">
      <button type="button" className="secondary" aria-expanded={abierto} aria-controls="cambiar-proyecto-panel" onClick={() => setAbierto(v => !v)}>
        {abierto ? 'Cerrar' : 'Cambiar proyecto'}
      </button>
      {abierto && (
        <div id="cambiar-proyecto-panel" className="cambiar-proyecto-panel panel" onKeyDown={e => { if (e.key === 'Escape') setAbierto(false); }}>
          <SelectorProyecto
            proyectos={proyectos} salas={salas ?? []} activoId={proyectoId} usuarioId={usuarioId}
            salaInicial={salaId ?? ''} autoEnfocar
            onElegir={id => { setAbierto(false); if (id !== proyectoId) navigate(`/proyectos/${id}${seccion ? `/${seccion}` : ''}`); }}
          />
        </div>
      )}
    </div>
  );
}
