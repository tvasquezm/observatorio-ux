# FASE F24: Guardado de permisos de sala y diagnóstico de acceso

Estado: hecha.

Archivos tocados: `SalaDetallePage.tsx`, `SalaDetalleProjects.test.tsx`, `SalaDetallePage.test.tsx`, `docs/DIAGNOSTICO_ACCESOS.md`, `docs/fases/DUDAS.md`, `CHANGELOG.md` y este cierre.

El estudiante recibe la explicación cuando la sala restringe la creación. La casilla guarda al cambiar, se deshabilita durante el guardado y vuelve al valor del servidor al fallar. El estado de la mutación se mantiene en el detalle de sala al pasar por otras pestañas. Se adaptaron las pruebas de configuración existentes al nuevo guardado automático.

Comandos ejecutados y resultado

- `pnpm --filter frontend exec vitest run src/features/salas` → 5 archivos y 31 pruebas pasan. Incluye el guardado al marcar, la vuelta desde Estudiantes, el error y los permisos del estudiante.
- `pnpm --filter frontend test` → 87 archivos y 822 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- Los borradores de estudiantes y equipos siguen cubiertos por sus pruebas. Se retiró el borrador específico de la casilla.

Pendiente de investigación posterior: sincronización de sesión entre pestañas, documentada con referencias al código en [el diagnóstico](../DIAGNOSTICO_ACCESOS.md).
