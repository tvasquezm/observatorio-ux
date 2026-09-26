# Plan de remediación — auditoría 2026-09-24

Contexto: `AUDITORIA_observatorio-ux.md` (seguridad, capas de request y capacidad
para ~200 usuarios simultáneos) reportó 0 hallazgos críticos/altos, 6 medios y
varios bajos, más un plan de rendimiento pendiente de aprobación. Este
documento trackea el cierre de esos hallazgos y del plan de rendimiento, fase
por fase, cada una con su propio commit. No reemplaza `docs/AUDIT_LOG.md`
(ese es el historial general de hallazgos del proyecto); este archivo es
específico de esta remediación y se puede borrar una vez cerradas todas las
fases (dejando la entrada correspondiente en `AUDIT_LOG.md`).

**Corrección hecha a la auditoría original:** el hallazgo H9 sobre acciones de
GitHub sin fijar a SHA no aplica — verificado contra `.github/workflows/ci.yml`,
las 5 acciones usadas ya están fijadas a SHA. Solo queda vigente la otra mitad
de H9 (puertos del compose de desarrollo sin restringir a `127.0.0.1`), que no
se incluye en este plan por ser de un compose de desarrollo, no de producción.

## Checklist de fases

- [x] Fase 1 — Auth: gating de `test-token`, consentimiento con credencial, timing/normalización de login (H2, H4, H6)
- [x] Fase 2 — Seed: guard de contraseñas demo en producción, deja de loguearlas, bootstrap explícito de admin (H3)
- [x] Fase 3 — Docker: imagen de producción sin root y sin dependencias de desarrollo (H7)
- [ ] Fase 4 — Nginx: `client_max_body_size`, `limit_req`, `keepalive`, gzip (H8 + rendimiento)
- [ ] Fase 5 — Rendimiento: `submitResult` sin N+1 de categorías, `maxWait`/`timeout` explícitos, pool de Prisma configurable
- [ ] Fase 6 — Prueba de carga k6 del flujo del participante (access → consent → join → results, 200 VUs)
- [ ] Fase 7 — Participantes anónimos: `proyectoId` en `Participante`, límite por proyecto, limpieza horaria de huérfanos (H5)

## Detalle por fase

### Fase 1 — Auth (H2, H4, H6)
- `issueDevelopmentEvaluatorToken` / `issueDevelopmentParticipantToken`: gate cambia de `!== 'production'` a `=== 'development'` (bloquea también `test` y cualquier entorno que no sea explícitamente `development`).
- `registerParticipantConsent`: exige `resumeToken`/Bearer del participante, igual que `/participants/token`.
- Login: compara contra un hash dummy cuando el usuario no existe (evita diferencia de timing), normaliza el email a minúsculas, agrega `MaxLength` a `LoginDto`.
- **Encontrado al implementar (no estaba en el PLAN original):** el frontend (`onboarding.api.ts`, `OnboardingPage.tsx`) nunca mandaba `resumeToken` al pedir consentimiento. Sin este ajuste, el fix de H4 rompía el flujo real de todo participante de acceso abierto. Se actualizaron ambos archivos para que lo manden desde `sessionStorage`.
- Archivos: `apps/backend/src/modules/auth/auth.service.ts`, DTO de login, `apps/frontend/src/features/onboarding/api/onboarding.api.ts`, `apps/frontend/src/features/onboarding/pages/OnboardingPage.tsx`.
- Verificación: frontend (`vitest`) corrido — 36/36 verde. Backend: no se pudo correr (`prisma generate` bloqueado en este sandbox, mismo límite que la auditoría original); tests actualizados pero pendientes de correr en un entorno con acceso a `binaries.prisma.sh`.
- Commit: `fix(auth): gating test-token, consentimiento con credencial y timing de login`.

### Fase 2 — Seed y bootstrap (H3)
- `seed.ts` / `seed-usuario.js` abortan si `NODE_ENV=production` y faltan `SEED_*_PASSWORD`; dejan de imprimir contraseñas por consola.
- Bootstrap explícito de ADMIN vía variable de entorno, para no depender del seed demo en producción.
- Archivos: `apps/backend/prisma/seed.ts`, `apps/backend/seed-usuario.js`, `apps/backend/prisma/bootstrap-admin.ts` (nuevo), `apps/backend/package.json` (script `bootstrap:admin`), `env.production.example`.
- Verificación: no hay tests existentes para estos scripts (son scripts de operación, no parte del suite de Jest); no se agregaron nuevos por desproporcionado (requeriría mockear Prisma para un script standalone). Chequeo de sintaxis TS limpio (solo errores esperados por falta de `prisma generate`).
- Commit: `fix(seed): bootstrap de admin y guard de contraseñas demo`.

### Fase 3 — Docker (H7)
- Etapa `production` del Dockerfile corre como `USER node`; solo dependencias de producción (sin `tsx`, `jest`, CLI de Prisma innecesaria en runtime).
- Archivos: `apps/backend/Dockerfile`.
- Ajuste no previsto en el PLAN original: `prisma`, `tsx` y `dotenv` estaban en `devDependencies` pero se usan en producción (`prisma migrate deploy` en el entrypoint; `tsx`/`dotenv` para correr `bootstrap:admin`/`seed` manualmente). Se movieron a `dependencies` en `apps/backend/package.json`, lo que además obligó a regenerar `pnpm-lock.yaml` (si no, `--frozen-lockfile` fallaba en CI y en el propio build de Docker). El resto de dev tools (`jest`, `typescript`, `ts-jest`, `ts-node`, `supertest`, `@nestjs/testing`, `@nestjs/cli`) sigue en `devDependencies` y ya no viaja a producción.
- Verificación real (no pude correr `docker build`, no hay Docker en este sandbox): repliqué el paso exacto del Dockerfile (`pnpm install --prod --frozen-lockfile` con los mismos `package.json`/lockfile copiados) en un directorio aparte — confirma que `prisma`, `tsx`, `dotenv`, `bcrypt` quedan instalados y `jest`, `typescript`, `ts-jest`, `ts-node`, `supertest` NO quedan. `pnpm-lock.yaml` regenerado: diff revisado, solo reclasifica specifiers ya resueltos, ninguna versión cambió.
- Commit: `fix(docker): imagen de producción sin root y sin deps de dev` (incluye `package.json` y `pnpm-lock.yaml`).

### Fase 4 — Nginx (H8 + rendimiento)
- `client_max_body_size`, `limit_req` propio, `keepalive` hacia `backend`/`frontend`, gzip.
- HSTS queda fuera: este nginx no termina TLS (ver deuda técnica H1) y prometerlo sería falso.
- Archivos: `deploy/nginx/default.conf`.
- Commit: `perf(nginx): keepalive, gzip y límites`.

### Fase 5 — Rendimiento de `submitResult`
- Reemplaza el `findUnique` de categoría por grupo (N+1 dentro del loop) por un `findMany` previo.
- `maxWait`/`timeout` explícitos en la transacción interactiva.
- `connection_limit`/`pool_timeout` en `DATABASE_URL` de `env.production.example`.
- Archivos: `apps/backend/src/modules/sessions/card-sorting/card-sorting.service.ts`, su spec (mock `category.findUnique` → `findMany`), `env.production.example`.
- Commit: `perf(db): submitResult y pool de Prisma`.

### Fase 6 — Prueba de carga
- `tests/load/participante.k6.js`: flujo access → consent → join → results, 200 VUs, mide errores y latencia p95.
- Depende de la fase 5 (mide el `submitResult` ya optimizado).
- Commit: `test: prueba de carga k6`.

### Fase 7 — Participantes anónimos (H5)
- Migración: columna `proyectoId` nullable en `Participante` (no rompe filas existentes).
- `accessParticipant`: límite de 300 participantes/hora por proyecto (`PARTICIPANTS_ACCESS_LIMIT_PER_HOUR`, configurable), además del `@Throttle(120/min)` por IP que ya existe y se mantiene igual (cubre el burst legítimo de una sala con IP compartida).
- Job cada hora (`@nestjs/schedule`) que borra `Participante` sin `consentimientos` y sin `sesiones` con más de 1 hora de antigüedad. Nunca toca uno con consentimiento o sesión real.
- Archivos: `apps/backend/prisma/schema.prisma` + migración, `apps/backend/src/modules/auth/auth.service.ts`, `apps/backend/src/modules/auth/auth.module.ts`, `apps/backend/src/modules/auth/participantes-cleanup.service.ts` (nuevo), `apps/backend/package.json`, `env.production.example`.
- Commit: `feat(auth): limpieza horaria y límite por proyecto de participantes anónimos`.

## Deuda técnica

### H1 — IP real detrás de proxy/TLS terminator
- **Estado:** no se cierra en este plan. Depende de una decisión de infraestructura (dónde y cómo se despliega en producción, si hay un proxy de la universidad de por medio) que no está tomada todavía.
- **Riesgo actual:** con la topología del `docker-compose.production.yml` tal cual está (un solo nginx propio, sin proxy externo delante), el sistema está bien: `trust proxy 1` asume un solo salto y hoy no hay más que ese nginx. El riesgo aparece únicamente si en el futuro se agrega un proxy/balanceador externo (de la universidad, un CDN, etc.) sin ajustar `trust proxy` y `set_real_ip_from` a esa topología real — ahí los límites por IP (login 5/min, etc.) se volverían globales.
- **Cuando se decida la infraestructura real, dos caminos:**
  1. TLS en el mismo nginx del compose (certbot/Let's Encrypt) — no requiere tocar `trust proxy` (sigue siendo 1 salto). Recomendado si no hay nada obligatorio de la universidad de por medio.
  2. Detrás de un proxy externo — requiere `set_real_ip_from` con el rango de IP de ese proxy y ajustar `trust proxy` al número real de saltos.
- **Qué falta para decidir:** dónde corre el servidor en producción, si hay dominio asignado, y si el tráfico pasa obligatoriamente por algo de la universidad antes de llegar al servidor.
