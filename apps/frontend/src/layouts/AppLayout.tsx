// apps/frontend/src/layouts/AppLayout.tsx

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { canSwitchPerspective, canViewAnalytics, canViewSalas, PERSPECTIVE_LABELS, resolvePerspective } from '../shared/auth/perspectivas';
import { useAccesoConfig } from '../features/auth/hooks/useAccesoConfig';
import { ProfilePerspectiveSwitcher } from '../shared/components/ProfilePerspectiveSwitcher';
import { PerspectivePreviewNotice } from '../shared/components/PerspectivePreviewNotice';
import { SessionExpiryDialog } from '../features/auth/components/SessionExpiryDialog';
import { FontSizeQuickAccess } from './FontSizeQuickAccess';
import { AvisoVersionNueva } from '../shared/components/AvisoVersionNueva';
import { ETIQUETA_VERSION } from '../shared/version';
const ExportReportDialog = lazy(() => import('../features/reports/ExportReportDialog').then((module) => ({ default: module.ExportReportDialog })));

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '◆', end: true },
  { to: '/proyectos', label: 'Proyectos', icon: '✣', end: false },
  { to: '/salas', label: 'Salas', icon: '▣', end: false },
  { to: '/admin', label: 'Administración', icon: '⚑', end: false },
];

const FONT_SIZE_KEY = 'observatorio-ux-font-size';
const FONT_SIZES = [
  { value: 'normal', percent: 100 },
  { value: 'large', percent: 112.5 },
  { value: 'xlarge', percent: 125 },
  { value: 'xxlarge', percent: 137.5 },
  { value: 'huge', percent: 150 },
] as const;
type FontSize = (typeof FONT_SIZES)[number]['value'];

type ThemeChoice = 'light' | 'dark' | 'system';
const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Según el sistema' },
];
const ROLE_LABELS: Record<string, string> = PERSPECTIVE_LABELS;

const CRUMB_LABELS: Record<string, string> = {
  '/': 'Inicio',
  '/proyectos': 'Proyectos',
  '/salas': 'Salas',
  '/salas/eliminadas': 'Salas eliminadas',
  '/admin': 'Administración',
  '/admin/profesores': 'Profesores',
};

export function AppLayout() {
  useEffect(() => { sessionStorage.removeItem('observatorio-ux-returnTo'); }, []);
  const { user, perspectiveRole, setPerspective, logout } = useAuthStore();
  // Solo se afirma el acceso con Google cuando el ingreso con contraseña está apagado (producción).
  const acceso = useAccesoConfig();
  const googleActivo = acceso.data?.enabled === true && !acceso.conContrasena;
  const location = useLocation();
  const navigate = useNavigate();
  // Tema elegido: claro, oscuro o el del sistema (sin preferencia guardada se sigue al sistema).
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const saved = window.localStorage.getItem('observatorio-ux-theme');
    return saved === 'dark' || saved === 'light' ? saved : 'system';
  });
  const [systemDark, setSystemDark] = useState(() => !!window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq?.addEventListener) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const darkMode = theme === 'dark' || (theme === 'system' && systemDark);
  const [exportOpen, setExportOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    window.localStorage.getItem('observatorio-ux-sidebar-collapsed') === 'true',
  );
  const [highContrast, setHighContrast] = useState(() =>
    window.localStorage.getItem('observatorio-ux-contrast') === 'high',
  );
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = window.localStorage.getItem(FONT_SIZE_KEY);
    return FONT_SIZES.some((size) => size.value === saved) ? (saved as FontSize) : 'normal';
  });
  const fontSizeIndex = FONT_SIZES.findIndex((size) => size.value === fontSize);
  const fontSizeControls = {
    percent: FONT_SIZES[fontSizeIndex].percent,
    canDecrease: fontSizeIndex > 0,
    canIncrease: fontSizeIndex < FONT_SIZES.length - 1,
    onDecrease: () => setFontSize(FONT_SIZES[fontSizeIndex - 1].value),
    onIncrease: () => setFontSize(FONT_SIZES[fontSizeIndex + 1].value),
  };
  const crumb = CRUMB_LABELS[location.pathname] ?? (location.pathname.startsWith('/salas/') ? 'Detalle de sala' : 'Proyectos');
  const preferencesRef = useRef<HTMLDialogElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.localStorage.setItem('observatorio-ux-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const activeRole = user ? resolvePerspective(user.rol, perspectiveRole) : null;
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.to === '/salas') return !!activeRole && canViewSalas(activeRole);
    if (item.to === '/admin') return activeRole === 'ADMIN';
    return true;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    window.localStorage.setItem('observatorio-ux-theme', theme);
  }, [darkMode, theme]);

  useEffect(() => {
    const contrast = highContrast ? 'high' : 'normal';
    document.documentElement.dataset.contrast = contrast;
    window.localStorage.setItem('observatorio-ux-contrast', contrast);
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    window.localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (location.pathname.startsWith('/proyectos/')) return;
    document.title = `${crumb} · Observatorio UX`;
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#main-content h1') ?? document.getElementById('main-content');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, crumb]);

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
    <div className={`app${sidebarCollapsed ? ' side-collapsed' : ''}`} data-perspective={activeRole?.toLowerCase()}>
      <SessionExpiryDialog />
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside ref={sidebarRef} className="side" aria-label="Navegación principal" onKeyDown={event => {
        if (event.key === 'Escape') { setSidebarCollapsed(true); sidebarRef.current?.querySelector<HTMLButtonElement>('.sidebar-toggle')?.focus(); }
      }}>
        <div className="brand">
          <img className="brand-isotipo" src="/brand/uxlab-isotipo-white.webp" width="144" height="92" alt="UXLab" />
          <div>
            <b>UXLab Observatorio</b>
            <small>Experiencia usuaria</small>
          </div>
        </div>

        <div className="sidebar-heading">
          <span className="side-label">Principal</span>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Minimizar barra lateral'}
            title={sidebarCollapsed ? 'Expandir barra lateral' : 'Minimizar barra lateral'}
            aria-expanded={!sidebarCollapsed}
            aria-controls="sidebar-navigation"
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d={sidebarCollapsed ? 'M4 6h16M4 12h16M4 18h16' : 'M15 5l-7 7 7 7'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav id="sidebar-navigation" className="side-nav" aria-label="Secciones principales">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
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
          <nav className="crumb" aria-label="Ubicación general"><Link to="/">Inicio</Link>{location.pathname !== '/' && <><span aria-hidden="true">›</span><strong>{crumb}</strong></>}</nav>
          <div className="top-actions">
            <FontSizeQuickAccess {...fontSizeControls} />
            <button type="button" className="ghost" aria-haspopup="dialog" onClick={() => preferencesRef.current?.showModal()}>
              Configuración
            </button>
            <dialog ref={preferencesRef} className="report-dialog preferences-dialog" aria-labelledby="settings-title">
              <div className="preferences-heading">
                <h2 id="settings-title">Configuración</h2>
                <button type="button" className="secondary" aria-label="Cerrar configuración" onClick={() => preferencesRef.current?.close()}>✕</button>
              </div>
              <div className="preferences-panel">
            {user && (
              <section className="preferences-account" aria-labelledby="preferences-account-title">
                <h3 id="preferences-account-title">Tu cuenta</h3>
                <div className="preferences-account-card">
                  <span className="preferences-account-avatar" aria-hidden="true">{iniciales}</span>
                  <div>
                    <strong>{user.nombre}</strong>
                    {user.email && <span>{user.email}</span>}
                    <span>{ROLE_LABELS[user.rol] ?? user.rol}{googleActivo ? ' · Ingresas con tu cuenta de Google' : ''}</span>
                  </div>
                </div>
                <button type="button" className="secondary" onClick={logout}>Cerrar sesión</button>
              </section>
            )}
            {user && activeRole && canSwitchPerspective(user.rol) && (
              <ProfilePerspectiveSwitcher
                accountRole={user.rol}
                activeRole={activeRole}
                onChange={changePerspective}
              />
            )}
            <div className="preferences-appearance">
              <h3>Apariencia</h3>
              <fieldset className="preferences-theme">
                <legend>Tema</legend>
                <div className="preferences-segmented">
                  {THEME_OPTIONS.map((option) => (
                    <label key={option.value} className={theme === option.value ? 'active' : undefined}>
                      <input type="radio" name="preferences-theme" value={option.value} checked={theme === option.value} onChange={() => setTheme(option.value)} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="preferences-switch">
                <input type="checkbox" role="switch" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
                <span className="preferences-switch-track" aria-hidden="true" />
                <span><strong>Alto contraste</strong><small>Bordes y textos más marcados.</small></span>
              </label>
              <p className="preferences-note">El tema y el contraste se guardan en este navegador. El tamaño del texto se cambia con el botón «Aa» de la barra superior.</p>
              <p className="preferences-note">Versión de la aplicación: <strong>{ETIQUETA_VERSION}</strong></p>
            </div>
              </div>
            </dialog>
            <button
              type="button"
              className="ghost"
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
        <AvisoVersionNueva />
        <div className="content" id="main-content" tabIndex={-1}>
          <Outlet />
        </div>
      </main>
      {exportOpen && <Suspense fallback={<span role="status">Preparando exportación…</span>}><ExportReportDialog projectId={location.pathname.match(/^\/proyectos\/([^/]+)/)?.[1]} onClose={() => setExportOpen(false)} /></Suspense>}
    </div>
  );
}
