// apps/frontend/src/shared/routing/ProtectedRoute.tsx
//
// Antes confiaba ciegamente en `isAuthenticated` derivado de localStorage.
// Ahora dispara checkSession() (GET /auth/me, ver useAuthStore) una vez al
// montar, para confirmar contra la cookie httpOnly real del backend en
// vez de contra la caché optimista de `user`. Mientras resuelve
// (`isChecking`), no redirige ni renderiza nada — evita un flash a
// /login en cada F5 antes de que /auth/me confirme la sesión.

import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/useAuthStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isChecking = useAuthStore((s) => s.isChecking);
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isChecking) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
