// apps/frontend/src/layouts/AppLayout.tsx

import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { useProject } from '../features/projects/hooks/useProjectsQueries';
import { useDocumentTitle } from '../shared/hooks/useDocumentTitle';
import { SUB_NAV } from './ProjectDetailLayout';
import { canViewAnalytics, canViewSalas, resolvePerspective } from '../shared/auth/perspectivas';
import { ProfilePerspectiveSwitcher } from '../shared/components/ProfilePerspectiveSwitcher';
import { PerspectivePreviewNotice } from '../shared/components/PerspectivePreviewNotice';
import { Icon, type IconName } from '../shared/components/ui/Icon';
const ExportReportDialog = lazy(() => import('../features/reports/ExportReportDialog').then((module) => ({ default: module.ExportReportDialog })));

const NAV_ITEMS: ReadonlyArray<{ to: string; label: string; icon: IconName; end: boolean }> = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/proyectos', label: 'Proyectos', icon: 'proyectos', end: false },
  { to: '/salas', label: 'Salas', icon: 'salas', end: false },
  { to: '/admin', label: 'Administración', icon: 'admin', end: false },
];

const CRUMB_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/proyectos': 'Proyectos',
  '/salas': 'Salas',
  '/salas/eliminadas': 'Eliminadas',
  '/admin': 'Administración',
  '/admin/profesores': 'Profesores',
};

interface Crumb {
  label: string;
  to?: string;
}

function buildCrumbs(pathname: string, proyectoId: string | undefined, rest: string | undefined, projectName: string | undefined): Crumb[] {
  if (proyectoId) {
    const section = SUB_NAV.find((item) => item.to !== '' && item.to === rest?.split('/')[0]);
    const project: Crumb = { label: projectName ?? 'Proyecto', to: section ? `/proyectos/${proyectoId}` : undefined };
    return [{ label: 'Proyectos', to: '/proyectos' }, project, ...(section ? [{ label: section.label }] : [])];
  }
  if (pathname === '/salas/eliminadas') return [{ label: 'Salas', to: '/salas' }, { label: 'Eliminadas' }];
  if (pathname.startsWith('/salas/')) return [{ label: 'Salas', to: '/salas' }, { label: 'Detalle de sala' }];
  if (pathname === '/admin/profesores') return [{ label: 'Administración', to: '/admin' }, { label: 'Profesores' }];
  return [{ label: CRUMB_LABELS[pathname] ?? 'Observatorio UX' }];
}

export function AppLayout() {
  const { user, perspectiveRole, setPerspective, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = window.localStorage.getItem('observatorio-ux-theme');
    return savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [exportOpen, setExportOpen] = useState(false);
  const projectMatch = useMatch('/proyectos/:proyectoId/*');
  const proyectoId = projectMatch?.params.proyectoId;
  const { data: proyecto } = useProject(proyectoId ?? null);
  const crumbs = buildCrumbs(location.pathname, proyectoId, projectMatch?.params['*'], proyecto?.nombre);
  useDocumentTitle([...crumbs].reverse().map((item) => item.label).join(' · '));
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.to === '/salas') return !!activeRole && canViewSalas(activeRole);
    if (item.to === '/admin') return activeRole === 'ADMIN';
    return true;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    window.localStorage.setItem('observatorio-ux-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const iniciales = (user?.nombre ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function changePerspective(role: NonNullable<typeof activeRole>) {
    setPerspective(role);

    if (!canViewSalas(role) && location.pathname.startsWith('/salas')) {
      navigate('/');
      return;
    }

    if (!canViewAnalytics(role) && location.pathname.endsWith('/analitica')) {
      navigate(location.pathname.replace(/\/analitica$/, ''));
    }
  }

  return (
    <div className="app" data-perspective={activeRole?.toLowerCase()}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside className="side" aria-label="Navegación principal">
        <div className="brand">
          <img className="brand-isotipo" src="/brand/uxlab-isotipo-white.webp" width="144" height="92" alt="UXLab" />
          <div>
            <b>UXLab Observatorio</b>
            <small>Experiencia usuaria</small>
          </div>
        </div>

        <span className="side-label">Principal</span>
        <nav className="side-nav" aria-label="Secciones principales">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="side-bottom">
          <div className="side-user">
            <span>{iniciales}</span>
            <div>
              <b>{user?.nombre}</b>
              <small>{user?.rol}</small>
            </div>
            <button type="button" onClick={logout}>Salir</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="top">
          <nav className="crumb" aria-label="Ruta de navegación">
            <ol>
              <li><Link to="/">Observatorio UX</Link></li>
              {crumbs.map((item, index) => (
                <li key={`${index}-${item.label}`}>
                  {item.to ? <Link to={item.to}>{item.label}</Link> : <strong aria-current="page">{item.label}</strong>}
                </li>
              ))}
            </ol>
          </nav>
          <div className="top-actions">
            {user && activeRole && (
              <ProfilePerspectiveSwitcher
                accountRole={user.rol}
                activeRole={activeRole}
                onChange={changePerspective}
              />
            )}
            <button
              type="button"
              className="theme-toggle"
              aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              aria-pressed={darkMode}
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setExportOpen(true)}
            >
              Exportar PDF
            </button>
          </div>
        </div>
        {user && activeRole ? (
          <PerspectivePreviewNotice
            key={activeRole}
            accountRole={user.rol}
            activeRole={activeRole}
            onRestore={() => changePerspective(user.rol)}
          />
        ) : null}
        <div className="content" id="main-content" tabIndex={-1}>
          <Outlet />
        </div>
      </main>
      {exportOpen && <Suspense fallback={<span role="status">Preparando exportación…</span>}><ExportReportDialog projectId={location.pathname.match(/^\/proyectos\/([^/]+)/)?.[1]} onClose={() => setExportOpen(false)} /></Suspense>}
    </div>
  );
}
