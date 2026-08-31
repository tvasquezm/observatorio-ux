// apps/frontend/src/layouts/AppLayout.tsx

import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/proyectos', label: 'Proyectos' },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '220px 1fr' }}>
      <aside style={{ background: '#173b56', color: '#fff', padding: 16 }}>
        <b style={{ display: 'block', marginBottom: 20 }}>UX Observatory</b>
        <nav style={{ display: 'grid', gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                padding: '8px 10px',
                borderRadius: 6,
                color: '#fff',
                textDecoration: 'none',
                background: isActive ? '#ffffff22' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <small style={{ display: 'block', opacity: 0.8 }}>{user?.nombre} · {user?.rol}</small>
          <button onClick={logout} style={{ marginTop: 8, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
