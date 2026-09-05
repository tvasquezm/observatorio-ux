# Comandos del proyecto

Recopilación de todos los comandos usados en observatorio-ux, con el caso en
que se usa cada uno. No reemplaza `BACKEND.md`, `comandos-backend.md` ni
`ONBOARDING-FRONTEND.md` — los resume en un solo lugar para consulta rápida.

---

## Docker (flujo principal)

| Comando | Cuándo usarlo |
|---|---|
| `cp env.example .env` | Primera vez que clonás el repo. Crea tu `.env` local a partir de los defaults de desarrollo. |
| `docker compose up --build` | Primer arranque, o cuando cambiaste un `Dockerfile` o agregaste una dependencia nueva (`package.json`). Reconstruye imágenes y levanta db + shared-types + backend + frontend. |
| `docker compose up` | Arranques normales del día a día, sin cambios de dependencias. |
| `docker compose up -d` | Igual que arriba, pero en segundo plano (no bloquea la terminal). |
| `docker compose logs -f` | Ver logs de todos los servicios en tiempo real (útil si levantaste con `-d`). |
| `docker compose logs -f backend` | Ver logs solo del backend (o `frontend`, `db`), cuando ya sabés dónde está el problema. |
| `docker compose ps` | Chequear qué contenedores están arriba y su estado (`healthy`, `running`). |
| `docker compose restart backend` | Reiniciar solo el backend — dispara de nuevo `entrypoint.sh` (migraciones + seed). Úsalo después de editar `apps/backend/prisma/seed.ts`. |
| `docker compose up -d --force-recreate frontend` | Cuando cambiaste una variable en `.env` (ej. `VITE_API_URL`). `docker compose restart` **no** relee `env_file` — hace falta recrear el contenedor. |
| `docker compose down` | Terminar la sesión de trabajo. Detiene y borra contenedores, conserva los datos de Postgres (volumen). |
| `docker compose down -v` | Cuando querés un estado 100% limpio (ej. la BD quedó en un estado raro). Borra también el volumen de Postgres — se pierde todo, el próximo `up` vuelve a correr el seed desde cero. |

---

## Backend — Prisma / base de datos

Corren dentro del contenedor (`docker compose exec backend <comando>`) salvo
que trabajes en el Flujo B (Node/pnpm local, ver `comandos-backend.md`).

| Comando | Cuándo usarlo |
|---|---|
| `pnpm --filter backend exec tsx prisma/seed.ts` | Re-poblar la BD manualmente sin reiniciar el contenedor, típicamente después de editar `seed.ts` (alternativa a `docker compose restart backend`). |
| `pnpm --filter backend exec prisma migrate dev` | Crear y aplicar una migración nueva cuando cambiaste `schema.prisma` (entorno de desarrollo). |
| `pnpm --filter backend exec prisma migrate deploy` | Aplicar migraciones pendientes sin generar una nueva (lo que corre automático el `entrypoint.sh` al levantar el backend). |
| `pnpm --filter backend exec prisma generate` | Regenerar el Prisma Client cuando TypeScript se queja de un campo que "no existe" pese a estar en `schema.prisma` y la migración ya aplicada — típico tras un checkout fresco o cambio de rama. |
| `pnpm --filter backend exec prisma studio` | Abrir un visor de la base de datos en `http://localhost:5555`, para inspeccionar filas a mano. |

---

## Backend — tests

| Comando | Cuándo usarlo |
|---|---|
| `pnpm --filter backend test` | Correr toda la suite de tests del backend antes de dar por cerrado un cambio. |
| `pnpm --filter backend test artifacts.service.spec.ts` | Correr solo un archivo de test puntual, mientras trabajás en ese módulo. |
| `pnpm --filter backend test:watch` | Dejar los tests corriendo en watch mode mientras editás código. |
| `pnpm --filter backend test:cov` | Ver el reporte de cobertura de tests. |

---

## Frontend

Siempre ejecutar `pnpm add`/`install` **desde dentro del contenedor**, nunca
desde el host — el store de pnpm del host y el del contenedor no coinciden
y tira `ERR_PNPM_UNEXPECTED_STORE`.

| Comando | Cuándo usarlo |
|---|---|
| `docker compose exec frontend pnpm --filter frontend add <paquete>` | Agregar una dependencia nueva al frontend mientras el stack corre en Docker. |
| `docker compose exec frontend pnpm install` | Reinstalar todas las dependencias del frontend desde el store correcto (ej. si el `node_modules` quedó inconsistente). |
| `pnpm --filter frontend dev` | Solo en Flujo B (sin Docker): levantar el frontend local en modo watch contra un backend real ya corriendo. |

---

## Troubleshooting

| Comando | Cuándo usarlo |
|---|---|
| `npx kill-port 3000` | El backend tira `EADDRINUSE :::3000` — hay otro proceso (típicamente una sesión de terminal vieja) ocupando el puerto. |
| `netstat -ano` + `taskkill` (Windows) | Igual caso que arriba, cuando `kill-port` no está disponible: identificar el PID que ocupa el puerto y matarlo a mano. |
| `docker compose run --rm backend pnpm install --frozen-lockfile` | Reinstalar dependencias del backend en un contenedor descartable, sin afectar el que está corriendo — útil para diagnosticar si un problema es de dependencias. |
| `curl http://localhost:5173` | Verificar que el frontend responde en Docker. Si da `ERR_CONNECTION_ABORTED` pese al contenedor "Up", revisar que `vite.config.ts` tenga `host: true` en `server` (si no, Vite solo escucha en `localhost` interno del contenedor). |

---

## Usuarios de seed (solo desarrollo local)

Creados automáticamente por `apps/backend/prisma/seed.ts` en cada arranque
del backend (salvo `NODE_ENV=production`, donde el seed se omite). **Nunca
deben existir en un entorno productivo real** — las contraseñas son valores
públicos, visibles en este mismo repositorio.

| Usuario | Email | Password | Rol / uso |
|---|---|---|---|
| Estudiante 1 | `estudiante1@ux.utem.cl` | `Demo1234!` | Miembro del proyecto demo base (además, `creadoPorId`). |
| Estudiante 2 | `estudiante2@ux.utem.cl` | `Demo1234!` | Miembro del mismo proyecto demo — sirve para probar acceso/lock concurrente con Estudiante 1 y 3. |
| Estudiante 3 | `estudiante3@ux.utem.cl` | `Demo1234!` | Miembro del mismo proyecto demo — mismo propósito que arriba. |
| Docente (profesor) | `profesor@test.com` | `profesor123` | Pensado para QA manual — trae un proyecto propio con las 5 técnicas UX ya cargadas (Card Sorting, Evaluación Heurística, Persona, Journey Map, Momentos Críticos). |

Las passwords son configurables vía `.env`: `SEED_PASSWORD` (las 3 cuentas
de estudiante comparten esa misma variable) y `SEED_PROFESOR_PASSWORD`, si
no querés usar el default.
