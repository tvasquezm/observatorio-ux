# FASE F6: Borrado definitivo con nombre verificado en servidor

Estado: hecha
Archivos tocados: `apps/backend/src/modules/salas/salas.service.ts`, `apps/backend/src/modules/salas/test/salas.service.spec.ts`, `apps/frontend/src/features/salas/api/salas.api.ts`, `apps/frontend/src/features/salas/hooks/useSalasQueries.ts`, `apps/frontend/src/features/salas/pages/SalasEliminadasPage.tsx`, `apps/frontend/src/features/salas/pages/SalasEliminadasPage.test.tsx` (nuevo), `docs/PLAN_AJUSTES.md`.

Comandos ejecutados y resultado:
- `pnpm --filter backend test -- src/modules/salas` -> 1 suite, 27 pruebas en verde (4 de `hardDelete`: nombre incorrecto, normalización de espacios, sin permiso antes de comparar, cascada real).
- `pnpm --filter backend test` -> 26 suites, 390 pruebas en verde (antes 389: la suite de salas suma una prueba).
- `pnpm --filter frontend exec vitest run src/features/salas` -> 5 archivos, 30 pruebas en verde (2 nuevas de `SalasEliminadasPage`).
- `pnpm --filter frontend test` y `pnpm --filter frontend build` -> verdes en la corrida conjunta con F7 (misma tanda de cambios de frontend; se detalla en `FASE_F7_CIERRE.md`).

Hecho:
- Backend, `salasService.hardDelete`: primero `assertOwnerOrAdmin(salaId, user, { allowDeleted: true })` (403/404 sin revelar nada del nombre) y después la comparación `dto.confirm` con `sala.nombre`, ambas normalizadas (NFC) y recortadas; si difieren, `BadRequestException('El nombre no coincide.')`. El resto del borrado en cascada no cambia. `ConfirmHardDeleteDto.confirm` sigue siendo un string no vacío.
- Frontend: `hardDeleteSala(salaId, nombre)` envía `{ confirm: nombre }`; `useHardDeleteSala` recibe `{ salaId, nombre }`; `SalasEliminadasPage` usa `requireText: nombre` para el borrado definitivo, de modo que el texto que viaja al servidor es exactamente lo que la persona escribió.
- `docs/PLAN_AJUSTES.md`: la línea del hard delete ya no menciona la constante `DELETE`.

Cambios respecto al plan (desvíos): ninguno. Frontend y backend salen juntos, como pedía la fase.

Pendientes y dudas: ninguno. Riesgo ALTO declarado en el plan: cubierto por los casos negativos (nombre distinto -> 400 y no borra; sin permiso -> 403 antes de comparar).
