// apps/frontend/src/layouts/ProjectDetailLayout.tsx
//
// Sub-navegación dentro de un proyecto. proyectoId se pasa a las páginas
// hijas vía useOutletContext (evita repetir useParams + validaciones en
// cada página individual).

import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { canViewAnalytics, resolvePerspective } from '../shared/auth/perspectivas';

const SUB_NAV = [
  { to: '', label: 'Resumen', end: true },
  { to: 'personas', label: 'Personas' },
  { to: 'journey-map', label: 'Journey Map' },
  { to: 'momentos-criticos', label: 'Momentos Críticos' },
  { to: 'card-sorting', label: 'Card Sorting' },
  { to: 'evaluacion-heuristica', label: 'Evaluación Heurística' },
  { to: 'comentarios', label: 'Comentarios' },
  { to: 'analitica', label: 'Analítica' },
  { to: 'miembros', label: 'Miembros' },
  { to: 'participantes', label: 'Participantes' },
];

export interface ProjectOutletContext {
  proyectoId: string;
}

export function ProjectDetailLayout() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const { data: proyecto } = useProject(proyectoId ?? null);
  const { user, perspectiveRole } = useAuthStore();
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const canManageParticipants =
    !!user && (activeRole === 'ADMIN' || user.id === proyecto?.creadoPorId);
  const visibleItems = SUB_NAV.filter((item) => {
    if (item.to === 'analitica') return !!activeRole && canViewAnalytics(activeRole);
    if (item.to === 'participantes') return canManageParticipants;
    return true;
  });

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

      <nav className="project-subnav" aria-label="Secciones del proyecto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `project-subnav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ proyectoId } satisfies ProjectOutletContext} />
    </div>
  );
}
