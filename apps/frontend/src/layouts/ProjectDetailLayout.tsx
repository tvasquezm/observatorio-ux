// apps/frontend/src/layouts/ProjectDetailLayout.tsx
//
// Sub-navegación dentro de un proyecto. proyectoId se pasa a las páginas
// hijas vía useOutletContext (evita repetir useParams + validaciones en
// cada página individual).

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { canViewAnalytics, resolvePerspective } from '../shared/auth/perspectivas';

const SUB_NAV = [
  { to: '', label: 'Resumen', end: true, group: 'Proyecto' },
  { to: 'personas', label: 'Personas', group: 'Técnicas' },
  { to: 'journey-map', label: 'Journey Map', group: 'Técnicas' },
  { to: 'momentos-criticos', label: 'Momentos críticos', group: 'Técnicas' },
  { to: 'card-sorting', label: 'Card Sorting', group: 'Técnicas' },
  { to: 'evaluacion-heuristica', label: 'Evaluación heurística', group: 'Técnicas' },
  { to: 'comentarios', label: 'Comentarios', group: 'Proyecto' },
  { to: 'analitica', label: 'Analítica', group: 'Proyecto' },
  { to: 'miembros', label: 'Miembros', group: 'Proyecto' },
  { to: 'participantes', label: 'Participantes', group: 'Proyecto' },
];

export interface ProjectOutletContext {
  proyectoId: string;
}

export function ProjectDetailLayout() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(() => window.matchMedia?.('(max-width: 768px)').matches ?? true);
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
  const currentSection = visibleItems.find((item) => item.to === (pathname.split('/')[3] ?? ''))?.label ?? 'Resumen';
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 768px)');
    if (!media) return;
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (menuRef.current) menuRef.current.open = !compact;
  }, [pathname, compact]);
  useEffect(() => {
    document.title = `${pathname.endsWith('/resultados') ? 'Resultados · ' : ''}${currentSection} · ${proyecto?.nombre ?? 'Proyecto'} · Observatorio UX`;
    if (proyecto && user) sessionStorage.setItem(`observatorio-ux-project:${user.id}`, proyectoId ?? '');
  }, [currentSection, proyecto?.nombre, proyectoId, user?.id, pathname]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = sectionRef.current?.querySelector<HTMLElement>('h1, h2') ?? document.getElementById('project-title');
      if (heading) { heading.tabIndex = -1; heading.focus(); }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  if (!proyectoId) return <p>Proyecto no especificado.</p>;

  return (
    <div>
      <nav className="project-breadcrumb" aria-label="Ubicación del proyecto">
        <Link to="/proyectos">Proyectos</Link><span aria-hidden="true">›</span>
        {currentSection === 'Resumen' ? <span aria-current="page">{proyecto?.nombre ?? 'Proyecto'}</span> : <><Link to={`/proyectos/${proyectoId}`}>{proyecto?.nombre ?? 'Proyecto'}</Link><span aria-hidden="true">›</span><span aria-current="page">{currentSection}</span></>}
      </nav>
      <div className="page-head">
        <div>
          <span className="kicker">PROYECTO DE INVESTIGACIÓN</span>
          <h1 id="project-title" tabIndex={-1}>{proyecto?.nombre ?? 'Proyecto'}</h1>
          {proyecto?.descripcion && <p>{proyecto.descripcion}</p>}
        </div>
      </div>

      <details ref={menuRef} open={!compact || undefined} className={`project-menu${compact ? '' : ' project-menu-desktop'}`} onKeyDown={(event) => {
        if (event.key !== 'Escape' || !compact) return;
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }}>
        <summary><span>Secciones del proyecto</span><strong>{currentSection}</strong></summary>
        <nav aria-label="Secciones del proyecto">
          {['Proyecto', 'Técnicas'].map((group) => (
            <section key={group} aria-label={group}>
              <h2>{group}</h2>
              {visibleItems.filter((item) => item.group === group).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `project-menu-link${isActive ? ' active' : ''}`}
                  onClick={() => { if (menuRef.current && compact) menuRef.current.open = false; }}
                >
                  {item.label}
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
      </details>

      <div ref={sectionRef} className="project-section"><Outlet context={{ proyectoId } satisfies ProjectOutletContext} /></div>
    </div>
  );
}
