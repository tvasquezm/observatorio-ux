# Sprint 5 — panel administrativo

Fecha de cierre técnico: 14 de septiembre de 2026.

## Alcance implementado

| Backlog | Estado verificable | Evidencia |
|---|---|---|
| E1. Gestión de usuarios | Completo | Listado de cuentas, rol actual y cambio de rol. Se impide que un ADMIN se quite su propio rol y que un docente con salas activas cambie de rol. |
| E2. CRUD de proyectos | Completo | Alta, lectura global, edición y eliminación lógica desde `/admin`. |
| E3. Sesiones por proyecto | Completo | Resumen por proyecto con responsable, cantidad de artefactos, sesiones totales, completadas y porcentaje. |
| E4. Restricción ADMIN | Completo | Guardia de ruta en frontend, `RolesGuard` en endpoints y validación adicional en servicios. |
| E5. Pruebas manuales | Preparado | La pauta incluye los recorridos T8–T10; las pruebas automatizadas cubren servicios, componentes y acceso denegado. La ejecución manual con usuarios reales sigue siendo una actividad humana. |
| E6. Pauta de usabilidad | Borrador completo | `sprint5-pauta-evaluacion-usabilidad.md`. Falta el envío y la revisión del profesor. |
| E7. Documentación | Completo | Este registro, arquitectura, changelog, README y cobertura automatizada actualizados. |
| R5. Reunión con profesor | Pendiente externo | No hay acta ni respuesta verificable; no se marca una reunión ficticia. |

## Contratos agregados

- `GET /api/users/accounts` — ADMIN; nunca devuelve `passwordHash`.
- `PATCH /api/users/:id/role` — ADMIN; acepta `ESTUDIANTE`, `DOCENTE` o
  `ADMIN`.
- `GET /api/projects/admin/overview` — ADMIN; consolida creador, sesiones y
  número de artefactos de cada proyecto vigente.
- `DELETE /api/projects/:id` — ADMIN; aplica Soft Delete mediante `deletedAt`.

## Decisiones

- El control de permisos se mantiene en tres capas: ruta del frontend,
  decorador/guardia del controlador y validación del servicio para las acciones
  administrativas sensibles.
- Los proyectos se eliminan de forma lógica para preservar trazabilidad y
  evitar borrar evidencia de investigación por cascada.
- El avance es `sesiones COMPLETADO / sesiones totales`. Un proyecto sin
  sesiones muestra 0 %, no un éxito artificial.
- La cuenta ADMIN actual no puede cambiar su propio rol desde la interfaz ni
  desde el servicio.

## Verificación automatizada

- Backend: listado seguro, cambios de rol y salvaguardas; resumen y borrado de
  proyectos; control de rol en servicio.
- Frontend: cuenta actual protegida, cambio de rol, creación/eliminación de
  proyectos y representación del progreso.
- E2E: un estudiante recibe 403 al consultar cuentas y es redirigido al intentar
  abrir `/admin`.

## Guion para cerrar R5

1. Revisar con el profesor el panel en `/admin`.
2. Presentar la pauta y acordar perfiles/tamaño de muestra.
3. Registrar fecha, asistentes, decisiones y tareas asignadas.
4. Adjuntar o enlazar el acta real y recién entonces marcar R5 como completo.
