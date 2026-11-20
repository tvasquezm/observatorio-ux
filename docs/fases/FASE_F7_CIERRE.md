# FASE F7: Confirmación escrita, proyecto, docente, equipo y persona

Estado: hecha
Archivos tocados: `apps/frontend/src/features/admin/components/AdminProjectsPanel.tsx`, `apps/frontend/src/features/admin/components/AdminProjectsPanel.test.tsx`, `apps/frontend/src/features/admin/pages/AdminProfesoresPage.tsx`, `apps/frontend/src/features/admin/pages/AdminProfesoresPage.test.tsx`, `apps/frontend/src/features/salas/pages/SalaDetallePage.tsx`, `apps/frontend/src/features/salas/pages/SalaDetallePage.test.tsx`, `apps/frontend/src/pages/PersonasPage.tsx`, `apps/frontend/src/pages/__tests__/PersonasPage.test.tsx`.

Comandos ejecutados y resultado:
- `pnpm --filter frontend exec vitest run src/features/admin src/pages/__tests__/PersonasPage.test.tsx` -> 5 archivos, 25 pruebas en verde (incluye "no elimina el proyecto si se cancela", "exige escribir el nombre" en docentes y la confirmación escrita de persona).
- `pnpm --filter frontend exec vitest run src/features/salas` -> 5 archivos, 31 pruebas en verde (incluye el borrado de equipo con nombre escrito).
- `pnpm --filter frontend test` -> 82 archivos, 789 pruebas en verde.
- `pnpm --filter frontend build` -> verde.

Hecho (los cuatro borrados confirmados, con su nombre completo y el texto actual del mensaje):
- `AdminProjectsPanel`: borrar proyecto pide escribir el nombre del proyecto.
- `AdminProfesoresPage` (`DocentesList`): borrar docente pide escribir el nombre.
- `SalaDetallePage` (`EquiposDeSalaDocente`): borrar equipo pide escribir el nombre del equipo.
- `PersonasPage`: borrar persona pide escribir el nombre completo (conserva `confirmLabel: 'Eliminar'`).
- Quedan con el diálogo simple, por D2: quitar estudiante o miembro, desvincular, salir de equipo, comentarios, momento crítico, fase de journey y cambio de rol.

Pruebas ajustadas por el cambio de contrato (no silenciadas):
- `AdminProjectsPanel.test.tsx`: la aserción de `confirm` ahora incluye `{ requireText: 'Portal académico' }`; se agrega el caso de cancelación.
- `PersonasPage.test.tsx`: el caso de eliminación escribe el nombre en el campo antes de confirmar, y el texto del diálogo se busca con un matcher específico para no chocar con la etiqueta del campo.
- `AdminProfesoresPage.test.tsx`: se amplió el simulacro de `useUsersQueries` y de los hooks de proyectos y se agregaron dos pruebas del borrado de docente (cancela y confirma).

Cambios respecto al plan (desvíos): ninguno. Los nombres pueden repetirse (dos docentes): el paso es deliberado y no un identificador único, tal como indica la fase. No se tocó el `window.confirm` de `EvidenciaEditor` (pendiente aparte).

Pendientes y dudas: ninguno.
