# CIERRE FASE F5

Fecha: 2026-11-12

Hecho:
- Toggle de proyectos derivado de la sala guardada, con borrador local y resincronización. Guardando/Guardado y error visible con reversión.
- PATCH invalida las consultas de salas, incluida la lista usada para elegir sala al crear proyectos.
- Navegación/recarga protegidas en configuración, estudiantes, equipos/miembros, formulario de sala y card sorting. Se detecta también texto aún no agregado a la lista de tarjetas.
- Un solo bloqueo de navegación en SalaDetallePage reúne el estado pendiente de sus paneles; las confirmaciones de cierre del formulario se conservan.
- Pruebas del servidor para guardar el permiso con dueño/admin y rechazar otro docente/estudiante.
- Diagnóstico basado en código en `docs/DIAGNOSTICO_ACCESOS.md`.

Archivos tocados: SalaDetallePage y pruebas, SalaProjectCreate, ProfesorSalasPage y pruebas, hooks/API de salas, CardSortingPage/Entry y pruebas, DTO y spec de salas.

Contratos reales: PATCH /salas/:salaId mantiene permiteCreacionProyectos boolean. `limiteIntegrantesEquipo` admite number | null; omitirlo sigue sin cambiarlo. null quita el límite y los números mantienen validación de entero ≥1. El esquema ya era nullable; no hay migración.

Auditoría previa: useUnsavedChanges protege enlaces/rutas/query/Atrás/Adelante mediante useBlocker y cierre/recarga mediante beforeunload. useDiscardChanges solo protege cierres explícitos. Formularios sin protección de navegación: sala, configuración, estudiantes, equipos/miembros y card sorting. Todos reciben protección; cambios inmediatos, selección de proyecto a vincular y filtros no se consideran edición perdida.

Desvíos: se corrige además el vacío del límite de integrantes, porque la UI prometía «vacío = sin límite» pero no enviaba el cambio. El servidor ya aceptaba null; se alinean tipos y envío sin relajar permisos.

Verificación:
```text
Pruebas nuevas de estado, error, payload y navegación: rojas antes, verdes después.
pnpm --filter frontend test: 80 archivos, 765 pruebas aprobadas
pnpm --filter frontend build: built in 715ms; exit 0
pnpm --filter backend test salas.service --runInBand: 26 pruebas aprobadas
pnpm --filter backend build: nest build; exit 0
Chromium, API simulada:
- Cambio pendiente bloquea salida; cancelar conserva el formulario.
- PATCH permiteCreacionProyectos=true, Guardando/Guardado, recarga conserva true.
- PATCH rechazado con 403 revierte al valor del servidor y deja explicación visible.
- Borrador de estudiante bloquea navegación; cancelarla conserva el correo.
- Aceptar descarte permite cambiar de pestaña.
- Vaciar límite envía null y sigue vacío tras recargar.
```

Capturas / evidencia manual: `evidencias/F5`, claro/oscuro, estados de guardado y error. Payloads y confirmaciones en verificacion.json. Los ensayos del servidor usan Prisma simulado; los permisos no se probaron contra producción.

Pendientes: contraste del diagnóstico con registros reales; sesión/renovación en F8/F10. La procedencia de los incidentes de la prueba se mantiene separada de los defectos confirmados en código.
