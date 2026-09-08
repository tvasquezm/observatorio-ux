// apps/frontend/src/shared/auth/permisos.ts
//
// Regla de oro (docs maestro Flujos de Usuarios): "La visibilidad no implica
// permiso para modificar". DOCENTE ve los artefactos del proyecto pero no
// puede editarlos/eliminarlos/bloquearlos — eso queda reservado a
// ESTUDIANTE/ADMIN, igual que ya lo exige el backend en ArtifactsController.

import type { EvaluatorRole } from '../../features/auth/api/auth.api';

export function puedeEditarArtefactos(role: EvaluatorRole | null | undefined): boolean {
  return role === 'ESTUDIANTE' || role === 'ADMIN';
}
