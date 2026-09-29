import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import type { EvaluatorRole } from '../../features/auth/api/auth.api';
import { useActivePerspective } from '../auth/useActivePerspective';

export function PerspectiveRoute({ allowed }: { allowed: readonly EvaluatorRole[] }) {
  const role = useActivePerspective();
  const location = useLocation();
  // Reenvía el contexto que le pasó el Outlet padre (ej. proyectoId de
  // ProjectDetailLayout) hacia su propio Outlet — sin esto, cualquier
  // ruta anidada bajo PerspectiveRoute pierde el contexto del padre.
  // Genérico a propósito: esta ruta también se usa sin contexto (ej. /salas).
  const context = useOutletContext();

  if (!role || !allowed.includes(role)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet context={context} />;
}
