# FASE F22: Proyectos sin sala y jerarquía

Estado: hecha.

Archivos tocados: `ProjectsPage.tsx`, `ProjectDetailLayout.tsx`, `ProjectCreateForm.tsx`, sus pruebas, `CHANGELOG.md` y este cierre.

La lista y la vista del proyecto muestran «Sin sala» cuando corresponde. El formulario explica cómo se relacionan sala, proyecto y técnicas, tanto con sala asignada como al elegirla. La opción «Agregar un proyecto a la sala» del detalle de sala sigue siendo la acción para el docente dueño.

Comandos ejecutados y resultado

- `pnpm --filter frontend exec vitest run src/features/projects src/pages` → 8 archivos y 95 pruebas pasan.
- `pnpm --filter frontend test` → 87 archivos y 822 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- Búsqueda de «Vincular a una sala» → solo aparece en las dos pruebas de ausencia.

Pendientes: ninguno.
