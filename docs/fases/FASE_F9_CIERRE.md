# FASE F9: Sesión revocable

Estado: hecha
Archivos tocados: `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/20261118120000_add_sesion_version/migration.sql` (nueva), `apps/backend/src/modules/auth/auth.service.ts`, `apps/backend/src/modules/auth/auth.controller.ts`, `apps/backend/src/modules/auth/test/auth.revocation.spec.ts` (nueva), `apps/backend/src/modules/auth/test/password-change.spec.ts`, `apps/backend/src/modules/auth/test/auth.identity-cache.spec.ts`, `apps/backend/scripts/check-session-refresh.mjs`.

Comandos ejecutados y resultado:
- `pnpm --filter backend exec prisma generate` -> Prisma Client 7.10.0 generado (sin errores de esquema).
- `pnpm --filter backend build` -> `nest build` sin errores.
- `pnpm --filter backend test` -> 27 suites, 395 pruebas en verde (5 nuevas de revocación).
- `node apps/backend/scripts/check-session-refresh.mjs` -> `PASS refresh: CSRF, expired JWT, me expiry, capped renewal, secure httpOnly cookie, revocación tras logout, 429.`

Hecho:
1. Migración aditiva: `Usuario.sesionVersion Int @default(0)` (columna `"sesionVersion"` en la tabla `usuarios`, `NOT NULL DEFAULT 0`). Ninguna migración existente se modificó.
2. La identidad cacheada (`TtlCache` de 30 s) incluye `sesionVersion`; `signEvaluatorToken` agrega el claim `sv` con la versión vigente en login, refresh, token de desarrollo y reemisión tras cambiar contraseña.
3. `validateTokenPayload` compara `payload.sv ?? 0` con la versión de la identidad y lanza 401 si difieren (un token sin `sv` cuenta como 0 y caduca solo en el plazo máximo de sesión).
4. `changePassword` sube `sesionVersion` en el mismo `updateMany` que cambia el hash (donde guarda contra cambios concurrentes), invalida la caché del usuario y devuelve la versión nueva; el controlador emite una cookie nueva con esa versión conservando `sessionStart` y `exp`, así la sesión que cambia la contraseña sigue viva.
5. `logout` ya no es un simple borrado de cookies: sin guard, lee `evaluadorToken`, la verifica con el secreto y, si es válida, sube la versión del `sub` e invalida la caché. Si falta o es inválida, solo limpia cookies. El endpoint responde 201 como antes.
6. `refresh` no cambia: el guard ya rechaza tokens con versión vieja.
7. El script de sesión agrega el caso de revocación (logout -> refresh y `/auth/me` con la cookie anterior -> 401; cookie nueva -> 200; logout con token inválido -> 201) y el del token sin `sv` aceptado con versión 0. El bloque de 429 quedó al final para no consumir el límite de renovación.

Cambios respecto al plan (desvíos):
- Las pruebas nuevas de revocación van en `auth.revocation.spec.ts` en lugar de sumarse a `auth.service.spec.ts` (este ya tiene 713 líneas y su propio simulacro de Prisma). Mismo servicio y mismos casos.
- `password-change.spec.ts` ajusta la expectativa del valor devuelto (`{ ok: true, sesionVersion: 1 }`) y comprueba el incremento en `data`. `auth.identity-cache.spec.ts` incluye `sesionVersion: 0` en la identidad esperada. No se silenció ninguna prueba.

Pendientes y dudas:
- Verificación complementaria con PostgreSQL 16 vacío. `prisma migrate deploy` aplicó las 26 migraciones, incluida `20261118120000_add_sesion_version`.
- Residual aceptado por D5: con más de una instancia, otra podría aceptar la cookie hasta 30 s por su caché de identidad. No se pudo comprobar cuántas instancias corre Render (F0): pendiente de dato.
