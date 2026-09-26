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
- [x] Fase 4 — Nginx: `client_max_body_size`, `limit_req`, `keepalive`, gzip (H8 + rendimiento)
- [x] Fase 5 — Rendimiento: `submitResult` sin N+1 de categorías, `maxWait`/`timeout` explícitos, pool de Prisma configurable
- [x] Fase 6 — Prueba de carga k6 del flujo del participante (access → consent → join → results, 200 VUs)
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
- `client_max_body_size 5m` (la app no tiene endpoints de subida de archivos; margen generoso sin exponer el body parser a payloads arbitrarios).
- `limit_req_zone` por IP en `/api/`: 20 r/s, `burst=60 nodelay`. **Ajuste no previsto en el PLAN original:** un `limit_req` estándar (10 r/s) es riesgoso acá porque una Sala es un grupo de estudiantes que puede compartir IP institucional (mismo tema que la deuda H1) — un valor bajo podría cortar a un curso completo cargando el dashboard a la vez. Se subió el margen; sigue siendo una protección real contra abuso de un solo cliente, no un rate-limit fino (eso ya lo cubre el `@Throttle` de auth a nivel de aplicación).
- `upstream backend_upstream`/`upstream frontend_upstream` con `keepalive 32` + `proxy_http_version 1.1` + `proxy_set_header Connection ""` en ambas locations (reemplaza el `proxy_pass` directo a `backend:3000`/`frontend:80`).
- `gzip on` con `gzip_types` para texto/JSON/JS/CSS/SVG, `gzip_min_length 256`, `gzip_comp_level 5`, `gzip_vary on`.
- HSTS queda fuera: este nginx no termina TLS (ver deuda técnica H1) y prometerlo sería falso.
- Archivos: `deploy/nginx/default.conf`.
- Verificación real: no hay Docker en este sandbox — se instaló `nginx` (paquete Ubuntu) y se corrió `nginx -t` con el `server{}` incluido dentro de un `http{}` mínimo (mismo mecanismo que `docker-compose.production.yml`, que monta el archivo en `/etc/nginx/conf.d/default.conf`), agregando `backend`/`frontend` a `/etc/hosts` para resolver los `upstream` → sintaxis válida confirmada. No se pudo probar `limit_req`/`gzip` bajo carga real (eso es Fase 6, k6).
- Commit: `perf(nginx): keepalive, gzip y límites`.

### Fase 5 — Rendimiento de `submitResult`
- Reemplaza el `findUnique` de categoría por grupo (N+1 dentro del loop) por un `findMany` previo sobre los `categoriaId` únicos de `grupos`, con un `Map` para el lookup dentro del loop. Misma validación de pertenencia (`category.sessionId !== study.id`), mismo comportamiento para el resto de la función.
- `$transaction(..., { maxWait: 5000, timeout: 10000 })` explícito (antes usaba los defaults de Prisma).
- `connection_limit=20&pool_timeout=20` agregado a `DATABASE_URL` en `env.production.example` — el backend corre en una sola instancia y Postgres del compose usa `max_connections` default (100); 20 deja margen para herramientas de administración.
- Archivos: `apps/backend/src/modules/sessions/card-sorting/card-sorting.service.ts`, su spec (2 tests nuevos: batch fetch de categorías por `categoriaId` y su validación de pertenencia; antes esa rama del código no tenía cobertura), `env.production.example`.
- Verificación real: mismo bloqueo de `binaries.prisma.sh` que las fases anteriores — no se pudo correr `prisma generate` ni, por lo tanto, `jest`/`nest build` reales. Se instalaron las dependencias del monorepo (`pnpm install --ignore-scripts`, sin tocar `pnpm-lock.yaml` real — se restauró desde `orig` antes de entregar) y se corrió `tsc --noEmit` sobre el backend completo, comparando línea por línea contra el mismo comando corrido sobre `orig`: la única diferencia son 3 errores nuevos, y los 3 son el mismo patrón de cascada por Prisma Client no generado que ya afecta a decenas de líneas preexistentes en este archivo (`Property 'X' does not exist on type '{}'` / implicit `any`) — no hay ningún error de un tipo distinto. Sin acceso a Postgres real tampoco se pudo medir el N+1 con datos reales; eso queda para la Fase 6 (k6).
- Commit: `perf(db): submitResult y pool de Prisma`.

### Fase 6 — Prueba de carga
- `tests/load/participante.k6.js`: flujo access → consent → join → results, rampa hasta 200 VUs (`ramping-vus`), thresholds `http_req_failed<5%` y `p(95)<800ms`. `PROYECTO_ID`/`ESTUDIO_ID` por env var, no crea datos.
- Depende de la fase 5 (mide el `submitResult` ya optimizado).
- **Nota de diseño (no es un bug del script):** los VUs corren desde una sola máquina, así que comparten IP real ante nginx. `limit_req` (20 r/s, burst 60) y el throttle global del backend (60/60s por IP — `join`/`results` no tienen `@Throttle` propio, a diferencia de `access`/`consent`/`token`) van a producir 429 esperables bajo carga sostenida. Es consistente con H1 (deuda técnica, topología de un solo salto): el script lo mide, no lo evita.
- Archivos: `tests/load/participante.k6.js` (nuevo), `docs/COMANDOS.md`.
- Verificación real: no hay `k6` ni Postgres real en este sandbox (mismo bloqueo de red que fases anteriores) — no se pudo correr contra un stack real. Se verificó sintaxis (`node --check`, ESM) y el script se armó leyendo los DTOs/controller/service reales (`auth.controller.ts`, `card-sorting.controller.ts`, `card-sorting.dto.ts`, `card-sorting.service.ts`), no de memoria. Pendiente correr en un entorno real antes de dar la fase por confirmada en la práctica.
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
