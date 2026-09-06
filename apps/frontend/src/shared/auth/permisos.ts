// apps/frontend/src/shared/auth/permisos.ts
//
// Regla de oro (docs maestro Flujos de Usuarios): "La visibilidad no implica
// permiso para modificar". DOCENTE ve los artefactos del proyecto pero no
// puede editarlos/eliminarlos/bloquearlos — eso queda reservado a
// ESTUDIANTE/ADMIN, igual que ya lo exige el backend en ArtifactsController.

import type { EvaluatorUser } from '../../features/auth/api/auth.api';

export function puedeEditarArtefactos(user: EvaluatorUser | null | undefined): boolean {
  return user?.rol === 'ESTUDIANTE' || user?.rol === 'ADMIN';
}
