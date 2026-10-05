// apps/frontend/src/layouts/AppLayout.tsx

import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { canViewAnalytics, canViewSalas, resolvePerspective } from '../shared/auth/perspectivas';
import { ProfilePerspectiveSwitcher } from '../shared/components/ProfilePerspectiveSwitcher';
import { PerspectivePreviewNotice } from '../shared/components/PerspectivePreviewNotice';
const ExportReportDialog = lazy(() => import('../features/reports/ExportReportDialog').then((module) => ({ default: module.ExportReportDialog })));

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◆', end: true },
  { to: '/proyectos', label: 'Proyectos', icon: '✣', end: false },
  { to: '/salas', label: 'Salas', icon: '▣', end: false },
  { to: '/admin', label: 'Administración', icon: '⚑', end: false },
];

const CRUMB_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/proyectos': 'Proyectos',
  '/salas': 'Salas',
  '/admin': 'Administración',
  '/admin/profesores': 'Profesores',
};

export function AppLayout() {
  const { user, perspectiveRole, setPerspective, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = window.localStorage.getItem('observatorio-ux-theme');
    return savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [exportOpen, setExportOpen] = useState(false);
  const crumb = CRUMB_LABELS[location.pathname] ?? 'Proyecto';
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
              <span className="nav-icon">{item.icon}</span>
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
          <span className="crumb">
            Observatorio UX <b>›</b> <strong>{crumb}</strong>
          </span>
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
