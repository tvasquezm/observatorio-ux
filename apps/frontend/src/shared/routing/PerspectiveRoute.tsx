import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { EvaluatorRole } from '../../features/auth/api/auth.api';
import { useActivePerspective } from '../auth/useActivePerspective';

export function PerspectiveRoute({ allowed }: { allowed: readonly EvaluatorRole[] }) {
  const role = useActivePerspective();
  const location = useLocation();

  if (!role || !allowed.includes(role)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
