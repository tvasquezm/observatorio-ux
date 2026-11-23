# FASE F4: Editar sala desde su detalle

Estado: hecha
Archivos tocados: `apps/frontend/src/features/salas/components/SalaFormDialog.tsx` (nuevo), `apps/frontend/src/features/salas/pages/ProfesorSalasPage.tsx`, `apps/frontend/src/features/salas/pages/SalaDetallePage.tsx`, `apps/frontend/src/features/salas/pages/SalaDetallePage.test.tsx`, `apps/frontend/src/styles/theme.css`.

Comandos ejecutados y resultado:
- `pnpm --filter frontend exec vitest run src/features/salas` -> 4 archivos, 27 pruebas en verde (incluye 6 pruebas nuevas de edición en el detalle).
- `pnpm --filter frontend build` -> verde (ver CIERRE de F5 para la corrida conjunta final).
- `pnpm --filter frontend test` (corrida conjunta con F5) -> 81 archivos, 787 pruebas en verde.

Hecho:
- Se extrajo de `ProfesorSalasPage` el formulario modal a `SalaFormDialog({ sala?, abierto, onClose, onSaved?, guardar?, onDirtyChange? })`, con los mismos campos, textos, validación (término posterior al inicio), bloqueo de campos al guardar, error dentro del formulario y protección de cambios sin guardar. `ProfesorSalasPage` lo usa sin cambiar su comportamiento: mismas etiquetas, mismo `dialog`, mismos botones, mismo aviso "Sala «X» creada/actualizada".
- `SalaDetallePage` muestra "Editar sala" en el encabezado con la condición `activeRole === 'ADMIN' || sala.profesor?.id === user?.id`; el estudiante y el docente no dueño no lo ven. Guarda con `useUpdateSala(salaId)` (`mutateAsync`), así el encabezado y la caché de la sala se actualizan, y el error 400/403 se muestra dentro del formulario.
- El formulario nuevo se suma al bloqueo único de navegación de `SalaDetallePage` con `onDirtyChange` -> `edicionDirty` (no abre un segundo bloqueo). El cierre del diálogo pide descartar una sola vez.
- CSS mínimo: `.sala-hero-action` para el botón del encabezado. Backend sin cambios.

Cambios respecto al plan (desvíos): ninguno. La firma real es `SalaFormDialog({ sala, abierto, onClose, onSaved, guardar, onDirtyChange })`: se agregaron `guardar` (para inyectar la mutación de TanStack Query desde el detalle) y `onDirtyChange` (para el bloqueo único), como preveía el plan al decir "firma nueva, a confirmar al ejecutar".

Pendientes y dudas:
- No hay Playwright para las capturas de comparación; la posición del botón se verificó con las pruebas de render.
- Nota: el CSS `.confirm-field` de F5 quedó incluido en el commit de F4 porque ambas fases se redactaron seguidas; no afecta el comportamiento.
