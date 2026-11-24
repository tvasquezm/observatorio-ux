// apps/frontend/src/shared/routing/ProtectedRoute.tsx
//
// Antes confiaba ciegamente en `isAuthenticated` derivado de localStorage.
// Ahora dispara checkSession() (GET /auth/me, ver useAuthStore) una vez al
// montar, para confirmar contra la cookie httpOnly real del backend en
// vez de contra la caché optimista de `user`. Mientras resuelve
// (`isChecking`) muestra un estado de carga en lugar de una pantalla vacía:
// el backend gratuito puede tardar hasta un minuto en despertar. Si no
// responde, ofrece reintentar o ir al inicio de sesión (F43).

import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { handleSessionExpired } from '../auth/session-expired';

/** Tras este tiempo se avisa que el servidor puede estar iniciándose. */
export const AVISO_ESPERA_MS = 4_000;

function ConectandoServidor() {
  const [lento, setLento] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLento(true), AVISO_ESPERA_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="route-loading route-loading--pantalla" role="status" aria-live="polite">
      <div className="skeleton skeleton-pantalla" aria-hidden="true">
        <span className="skeleton-forma skeleton-titulo" />
        <div className="skeleton-tarjetas">{[0, 1, 2].map(i => <div key={i} className="skeleton-tarjeta"><span className="skeleton-forma skeleton-linea" style={{ width: '60%' }} /><span className="skeleton-forma skeleton-linea" style={{ width: '90%' }} /></div>)}</div>
      </div>
      <p>
        {lento
          ? 'El servidor se está iniciando. Puede tardar hasta un minuto…'
          : 'Conectando con el servidor…'}
      </p>
    </div>
  );
}

export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isChecking = useAuthStore((s) => s.isChecking);
  const sessionUnreachable = useAuthStore((s) => s.sessionUnreachable);
  const checkSession = useAuthStore((s) => s.checkSession);
  const retrySession = useAuthStore((s) => s.retrySession);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isChecking && !sessionUnreachable && !isAuthenticated) handleSessionExpired(location.pathname + location.search);
  }, [isChecking, sessionUnreachable, isAuthenticated, location.pathname, location.search]);

  if (isChecking) return <ConectandoServidor />;

  if (sessionUnreachable) {
    return (
      <div className="route-loading route-loading--pantalla route-loading--error" role="alert">
        <p>No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.</p>
        <div className="route-loading-acciones">
          <button type="button" className="primary" onClick={() => void retrySession()}>Reintentar</button>
          <Link to="/login">Ir a iniciar sesión</Link>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
