// apps/frontend/src/layouts/AppLayout.tsx

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { exportarResumenPdf } from '../shared/utils/pdf';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◆', end: true },
  { to: '/proyectos', label: 'Proyectos', icon: '✣', end: false },
];

const CRUMB_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/proyectos': 'Proyectos',
};

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = window.localStorage.getItem('observatorio-ux-theme');
    return savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const crumb = CRUMB_LABELS[location.pathname] ?? 'Proyecto';

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

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <img className="brand-isotipo" src="/brand/uxlab-isotipo-white.png" alt="UXLab" />
          <div>
            <b>UXLab Observatorio</b>
            <small>Experiencia usuaria</small>
          </div>
        </div>

        <span className="side-label">NAVEGACIÓN</span>
        <nav className="side-nav">
          {NAV_ITEMS.map((item) => (
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
            <button onClick={logout}>Salir</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="top">
          <span className="crumb">
            Observatorio UX <b>›</b> <strong>{crumb}</strong>
          </span>
          <div className="top-actions">
            <span className="role">{user?.rol?.toUpperCase()}</span>
            <button
              type="button"
              className="theme-toggle"
              aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              aria-pressed={darkMode}
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? '☼ Claro' : '☾ Oscuro'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                exportarResumenPdf(crumb, [
                  `Usuario: ${user?.nombre ?? ''}`,
                  `Rol: ${user?.rol ?? ''}`,
                  `Vista: ${crumb}`,
                  '',
                  'Exportado desde Observatorio UX',
                ])
              }
            >
              ↓ PDF
            </button>
          </div>
        </div>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
