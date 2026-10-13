// apps/frontend/src/shared/auth/permisos.ts
//
// Regla de oro (docs maestro Flujos de Usuarios): "La visibilidad no implica
// permiso para modificar". Edita quien es ESTUDIANTE, o el DOCENTE/ADMIN
// que además es el creador del proyecto (accede "como estudiante" para
// hacer demostraciones sobre SU propio proyecto) — igual que ahora lo
// exige `ArtifactsService.assertPuedeEditar` en el backend. Cualquier otro
// DOCENTE/ADMIN queda en solo-observación.

import type { EvaluatorRole } from '../../features/auth/api/auth.api';

export function puedeEditarArtefactos(
  role: EvaluatorRole | null | undefined,
  userId?: string | null,
  proyectoCreadoPorId?: string | null,
): boolean {
  if (role === 'ESTUDIANTE') return true;
  return !!userId && !!proyectoCreadoPorId && userId === proyectoCreadoPorId;
}
