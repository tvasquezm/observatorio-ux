# Comandos del proyecto

Recopilación de todos los comandos usados en observatorio-ux, con el caso en
que se usa cada uno. No reemplaza `BACKEND.md`, `comandos-backend.md` ni
`ONBOARDING-FRONTEND.md` — los resume en un solo lugar para consulta rápida.

---

## Docker (flujo principal)

Ejecuta los comandos desde la raíz del repositorio con Docker Desktop o Docker Engine iniciado. En una copia nueva, crea el archivo de configuración **solo si falta**: `Copy-Item env.example .env` en PowerShell o `cp env.example .env` en Bash. Conserva un `.env` existente.

```sh
docker compose config --quiet
docker compose up -d --build db shared-types backend
```

Cuando `http://localhost:3000/api/health` devuelva `"status":"ok"`, completa el arranque:

```sh
docker compose up -d --wait
docker compose ps
```

Abre `http://localhost:5173` para ver la pantalla de acceso y `http://localhost:5173/api/health` para comprobar que el proxy llega a la API. Debe devolver `status` con valor `ok`. Para diagnosticar un fallo, compara con `http://localhost:3000/api/health` y consulta `docker compose logs --tail=80 backend frontend shared-types db`.

En una base nueva destinada a demostración, ejecuta una vez `docker compose exec backend pnpm --filter backend seed` y utiliza las cuentas indicadas más abajo. El seed modifica datos de ejemplo. Para terminar, usa `docker compose down`: conserva el volumen de PostgreSQL.

| Comando | Cuándo usarlo |
|---|---|
| `cp env.example .env` | Primera vez que clonás el repo. Crea tu `.env` local a partir de los defaults de desarrollo. |
| `docker compose up --build` | Primer arranque, o cuando cambiaste un `Dockerfile`. Reconstruye imágenes y levanta db + shared-types + backend + frontend. |
| `docker compose up` | Arranques normales del día a día. También tras un `git pull` que cambió dependencias: cada servicio compara el hash de `pnpm-lock.yaml` al arrancar y reinstala solo lo suyo si cambió. |
| `docker compose down` + `docker compose up --build -V` | Último recurso si un `node_modules` quedó inconsistente pese a lo anterior. `-V` recrea los volúmenes anónimos de dependencias (no toca los datos de Postgres). |
| `docker compose up -d` | Igual que arriba, pero en segundo plano (no bloquea la terminal). |
| `docker compose logs -f` | Ver logs de todos los servicios en tiempo real (útil si levantaste con `-d`). |
| `docker compose logs -f backend` | Ver logs solo del backend (o `frontend`, `db`), cuando ya sabés dónde está el problema. |
| `docker compose ps` | Chequear qué contenedores están arriba y su estado (`healthy`, `running`). |
| `docker compose restart backend` | Reinicia la API, aplica migraciones y regenera el cliente Prisma. El seed solo se ejecuta en desarrollo si se configuró `SEED_ON_START=true`. |
| `docker compose up -d --force-recreate frontend` | Cuando cambiaste una variable en `.env` (ej. `VITE_API_URL`). `docker compose restart` **no** relee `env_file` — hace falta recrear el contenedor. |
| `docker compose down` | Terminar la sesión de trabajo. Detiene y borra contenedores, conserva los datos de Postgres (volumen). |
| `docker compose down -v` | Solo para descartar deliberadamente la base local: elimina el volumen de PostgreSQL y sus datos. El siguiente arranque aplica las migraciones. |

---

## Backend — Prisma / base de datos

Corren dentro del contenedor (`docker compose exec backend <comando>`) salvo
que trabajes en el Flujo B (Node/pnpm local, ver `comandos-backend.md`).

| Comando | Cuándo usarlo |
|---|---|
| `pnpm --filter backend seed` | Cargar datos demo explícitamente en una base local. Puede restablecer las cuentas y proyectos de ejemplo. |
| `pnpm --filter backend exec prisma migrate dev` | Crear y aplicar una migración nueva cuando cambiaste `schema.prisma` (entorno de desarrollo). |
| `pnpm --filter backend exec prisma migrate deploy` | Aplicar migraciones pendientes sin generar una nueva (lo que corre automático el `entrypoint.sh` al levantar el backend). |
| `pnpm --filter backend exec prisma generate` | Regenerar el Prisma Client cuando TypeScript se queja de un campo que "no existe" pese a estar en `schema.prisma` y la migración ya aplicada — típico tras un checkout fresco o cambio de rama. |
| `pnpm --filter backend exec prisma studio` | Abrir Prisma Studio para inspeccionar filas. Si se ejecuta dentro de Docker necesitarás publicar el puerto que indique Studio. |

### Primer arranque lento

En una copia limpia, los servicios instalan sus dependencias antes de escuchar en sus puertos. Si Compose detiene el arranque del frontend porque el backend figura como `unhealthy`, consulta `docker compose logs --tail=80 backend`. Mientras el registro muestre progreso en la instalación, conserva los contenedores y volúmenes para aprovechar lo descargado.

1. Desde la raíz, ejecuta `docker compose up -d --build db shared-types backend`. Así la base y la API pueden terminar su preparación antes de iniciar la web.
2. Abre `http://localhost:3000/api/health`. Si todavía no responde, sigue el registro con `docker compose logs -f backend`. Cuando la API responda con `"status":"ok"`, pulsa Ctrl+C para salir del registro.
3. Ejecuta `docker compose up -d --wait`. Cuando Vite esté listo, abre `http://localhost:5173` y comprueba también `http://localhost:5173/api/health`.

Si el registro termina con un error de migración, conexión o instalación, resuelve ese error antes de repetir el paso. Borrar el volumen de datos no es necesario para completar un arranque lento.

**Comprobación del 2 de noviembre de 2026.** En una copia limpia en Windows, con Docker Desktop y una base nueva, el arranque por etapas permitió abrir el frontend y obtener `status: ok` tanto en la API directa como a través de Vite. Después de cargar el seed, el inicio de sesión y `/api/auth/me` devolvieron el rol esperado para las tres cuentas de demostración.

---

## Ejecución de pruebas

### Ejecutar toda la suite de pruebas

```bash
pnpm --filter backend test
```

### Ejecutar un módulo específico

```bash
pnpm --filter backend test auth.service.spec.ts
pnpm --filter backend test projects.service.spec.ts
pnpm --filter backend test card-sorting.service.spec.ts
pnpm --filter backend test evaluacion-heuristica.service.spec.ts
pnpm --filter backend test artifacts.service.spec.ts
pnpm --filter backend test env.validation.smoke.spec.ts
```

### Ejecutar las pruebas en modo Watch

```bash
pnpm --filter backend test:watch
```

### Generar reporte de cobertura

```bash
pnpm --filter backend test:cov
```

El comando `test:cov` genera además un reporte de cobertura en la carpeta `coverage/` del backend, permitiendo analizar el porcentaje de código cubierto por las pruebas automatizadas.

## Frontend — tests (Vitest, desde Sprint 8)

| Comando | Cuándo usarlo |
|---|---|
| `pnpm --filter frontend test` | Correr la suite de tests del frontend (`vitest run`). |
| `pnpm --filter frontend exec vitest` | Modo watch, mientras editás un componente. |

Requiere `pnpm install` desde la raíz primero — las devDependencies de
Vitest/Testing Library son nuevas de este sprint y no están en un
`pnpm-lock.yaml` viejo.

---

## Prueba de carga (k6, Fase 6 de `docs/PLAN_REMEDIACION_AUDITORIA.md`)

Requiere `k6` instalado en el host y un proyecto + estudio de Card Sorting
ya sembrados (no crea datos).

| Comando | Cuándo usarlo |
|---|---|
| `BASE_URL=http://localhost PROYECTO_ID=<uuid> ESTUDIO_ID=<uuid> k6 run tests/load/participante.k6.js` | Simula hasta 200 participantes concurrentes en el flujo access → consent → join → results. |

`BASE_URL` debe apuntar al stack completo detrás de nginx (no directo al
backend), para incluir los límites de `deploy/nginx/default.conf`.

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

Estas cuentas están disponibles después de cargar explícitamente el seed en desarrollo. Sus contraseñas predeterminadas son públicas y solo sirven para una instalación local de demostración.

| Usuario | Email | Password | Rol / uso |
|---|---|---|---|
| Estudiante 1 | `estudiante1@ux.utem.cl` | `Demo1234!` | Miembro del proyecto demo base (además, `creadoPorId`). |
| Estudiante 2 | `estudiante2@ux.utem.cl` | `Demo1234!` | Miembro del mismo proyecto demo — sirve para probar acceso/lock concurrente con Estudiante 1 y 3. |
| Estudiante 3 | `estudiante3@ux.utem.cl` | `Demo1234!` | Miembro del mismo proyecto demo — mismo propósito que arriba. |
| Docente (profesor) | `profesor@test.com` | `profesor123` | Pensado para QA manual — trae un proyecto propio con las 5 técnicas UX ya cargadas (Card Sorting, Evaluación Heurística, Persona, Journey Map, Momentos Críticos). |
| Administrador | `admin@test.com` | `admin1234` | Permite probar las perspectivas Estudiante, Docente y Administrador. Configurable con `SEED_ADMIN_PASSWORD`. |

Las passwords son configurables vía `.env`: `SEED_PASSWORD` (las 3 cuentas
de estudiante comparten esa misma variable) y `SEED_PROFESOR_PASSWORD`, si
no querés usar el default.

---

## Flujo con Pull Request y CI

`main` está protegida: los cambios entran por Pull Request y el CI debe pasar.
El CI (`.github/workflows/ci.yml`) corre en cada PR y en cada push a `main`
con tres jobs:

| Job | Qué valida |
|---|---|
| `dependency-audit` | `pnpm audit --audit-level high` sobre `pnpm-lock.yaml`. Es el más rápido: falla antes de que termine el build. |
| `build-and-test` | Migraciones contra Postgres real, tests de backend y frontend, build del frontend y E2E (escritorio + móvil). |
| `deployment-smoke` | Construye y levanta `docker-compose.production.yml` desde cero y consulta `/nginx-health`, `/api/health` y `/`. |

| Comando | Cuándo usarlo |
|---|---|
| `pnpm audit --audit-level high` | Reproducir en local lo que hace `dependency-audit` antes de abrir el PR. |
| VS Code → paleta de comandos → `Git: Create Branch...` | Crear la rama de trabajo antes de commitear (no commitear directo en `main`). |
| VS Code → Source Control → `Publish Branch` | Subir la rama y abrir el PR desde el aviso que muestra GitHub (`Compare & pull request`). |

Cada PR trae una plantilla con un checklist (`.github/pull_request_template.md`).
`.github/CODEOWNERS` solicita revisión automática cuando el PR toca auth,
permisos, migraciones, `deploy/`, Dockerfiles o `.github/`.

Dependabot (`.github/dependabot.yml`) abre cada lunes un PR agrupado con las
actualizaciones menores y de parche de dependencias, actions y Dockerfiles.
Sus PR pasan por el mismo CI: revisa que quede en verde antes de fusionar.
Las vulnerabilidades se reportan de forma privada según `SECURITY.md`.
