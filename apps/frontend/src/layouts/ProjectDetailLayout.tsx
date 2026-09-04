// apps/frontend/src/layouts/ProjectDetailLayout.tsx
//
// Sub-navegación dentro de un proyecto. proyectoId se pasa a las páginas
// hijas vía useOutletContext (evita repetir useParams + validaciones en
// cada página individual).

import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useProject } from '../features/projects/hooks/useProjectsQueries';

const SUB_NAV = [
  { to: '', label: 'Resumen', end: true },
  { to: 'personas', label: 'Personas' },
  { to: 'journey-map', label: 'Journey Map' },
  { to: 'momentos-criticos', label: 'Momentos Críticos' },
  { to: 'card-sorting', label: 'Card Sorting' },
  { to: 'evaluacion-heuristica', label: 'Evaluación Heurística' },
  { to: 'analitica', label: 'Analítica' },
];

export interface ProjectOutletContext {
  proyectoId: string;
}

export function ProjectDetailLayout() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const { data: proyecto } = useProject(proyectoId ?? null);

  if (!proyectoId) return <p>Proyecto no especificado.</p>;

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="kicker">PROYECTO DE INVESTIGACIÓN</span>
          <h1>{proyecto?.nombre ?? 'Proyecto'}</h1>
          {proyecto?.descripcion && <p>{proyecto.descripcion}</p>}
        </div>
      </div>

      <nav style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', margin: '0 0 16px', flexWrap: 'wrap' }}>
        {SUB_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              padding: '8px 12px',
              textDecoration: 'none',
              color: isActive ? 'var(--teal)' : '#557582',
              borderBottom: isActive ? '2px solid var(--teal)' : '2px solid transparent',
              fontWeight: isActive ? 700 : 400,
              fontSize: 13,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ proyectoId } satisfies ProjectOutletContext} />
    </div>
  );
}
