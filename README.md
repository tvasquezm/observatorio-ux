# 🔬 Observatorio UX — Plataforma SaaS de Investigación UX

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

[![CI](https://github.com/tvasquezm/observatorio-ux/actions/workflows/ci.yml/badge.svg)](https://github.com/tvasquezm/observatorio-ux/actions/workflows/ci.yml)

Plataforma SaaS para la ejecución, gestión y análisis matemático de metodologías de investigación en Experiencia de Usuario (UX), desarrollada para el **Observatorio UX para la Inclusión Social** de la Universidad Tecnológica Metropolitana (UTEM).

Trabajo de título de **Ingeniería en Informatica (UTEM)**. Centraliza en un solo lugar cinco metodologías de UX Research —Evaluación Heurística, Card Sorting, Perfil de Persona, Journey Map y Mapa de Momentos Críticos—, con autenticación por roles, gestión de proyectos y un modelo de datos pensado para el análisis, no solo el almacenamiento.

> **Estado:** en desarrollo activo. Los entregables técnicos de los Sprints 1–7 están implementados (incluye reportería PDF/JSON y prueba de carga k6); las reuniones y validaciones humanas pendientes se registran por separado. Antes de auditar o contribuir, revisa [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Vulnerabilidades: [`SECURITY.md`](SECURITY.md).

## Tabla de contenidos

- [🔬 Observatorio UX — Plataforma SaaS de Investigación UX](#-observatorio-ux--plataforma-saas-de-investigación-ux)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Sobre el proyecto](#sobre-el-proyecto)
  - [Arquitectura](#arquitectura)
  - [Stack tecnológico](#stack-tecnológico)
  - [Roles y acceso](#roles-y-acceso)
  - [Estructura del monorepo](#estructura-del-monorepo)
  - [Instalación y despliegue local](#instalación-y-despliegue-local)
    - [1. Clonar el repositorio](#1-clonar-el-repositorio)
    - [2. Configurar variables de entorno](#2-configurar-variables-de-entorno)
    - [3. Levantar todo con Docker Compose](#3-levantar-todo-con-docker-compose)
    - [Despliegue productivo](#despliegue-productivo)
  - [Testing](#testing)
  - [CI](#ci)
  - [Documentación adicional](#documentación-adicional)
  - [Licencia](#licencia)
  - [Autoría y contexto académico](#autoría-y-contexto-académico)

## Sobre el proyecto

Los equipos de investigación UX suelen trabajar con herramientas fragmentadas (hojas de cálculo, formularios sueltos, notas dispersas), lo que dificulta la trazabilidad y hace inviable un análisis matemático riguroso. Observatorio UX resuelve esto con un modelo de datos único y módulos de reportería comunes (exportación a PDF y JSON) para comparar evidencia entre sesiones y proyectos.

## Arquitectura

Monorepo con **arquitectura de slices verticales** (bajo acoplamiento, alta cohesión):

- `apps/backend/` — API RESTful en NestJS. `core/` = infraestructura transversal (acceso, caché, configuración, base de datos, decoradores, filtros, guards y pipes). `modules/` = un slice por dominio: `auth`, `users`, `projects`, `artifacts`, `salas`, `equipos`, `comments`, `reports` y `sessions` (con las metodologías `card-sorting` y `evaluacion-heuristica`); **ninguna metodología importa código de otra**.
- `apps/frontend/` — SPA en React. `shared/` = UI base y hooks globales. `features/` = lógica e interfaces por dominio (`admin`, `auth`, `card-sorting`, `comments`, `equipos`, `evaluacion-heuristica`, `journey-map`, `legal`, `momentos-criticos`, `onboarding`, `persona`, `projects`, `reports`, `salas`), en espejo con `modules/` del backend.
- `packages/shared-types/` — contratos DTO y validación compartidos entre ambos.

La interfaz usa un sistema de diseño propio, **Academic Minimalism**: paleta monocromática en grises + un "Azul Académico" (Indigo) reservado para acciones transaccionales.

> Toda la API usa **un solo idioma para las rutas: inglés** (`/api/projects`, `/api/projects/:id/artifacts` y `/api/projects/:id/evaluacion-heuristica/...`). Ver `docs/ARCHITECTURE.md` §5.

## Stack tecnológico

- **Runtime:** Node.js ≥ 24, pnpm 10.34.5 (monorepo), TypeScript 5.9
- **Backend:** NestJS 12 (ESM), Prisma 7 (generador `prisma-client` + adapter `@prisma/adapter-pg`), PostgreSQL, validación con `class-validator` y Zod 4, Swagger
- **Frontend:** React 18 (Vite 8), React Router 7, Zustand, TanStack Query, CSS propio (`src/styles/theme.css`), `pdfmake` para exportar PDF
- **Concurrencia:** bloqueo pesimista con TTL para edición de artefactos (`POST`/`DELETE .../artifacts/:id/lock`) + constraints a nivel de base de datos
- **Infra:** Docker Compose para desarrollo y despliegue productivo con Nginx como reverse proxy
- **Reportería:** PDF por proyecto + exportación JSON, con control de acceso
- **Pruebas:** Jest 30 (backend), Vitest 4 (frontend), Playwright (E2E escritorio y móvil) y k6 (carga del flujo de participantes, rampa hasta 200 VUs)

## Roles y acceso

- **ADMIN, DOCENTE y ESTUDIANTE:** cuentas con autenticación y control de permisos por rol. El primer administrador se crea con `pnpm --filter backend run bootstrap:admin`.
- **Salas y equipos:** los docentes organizan estudiantes en salas (con período y fechas) y, opcionalmente, en equipos. Los proyectos pueden vincularse a una sala.
- **Participantes:** acceden a las sesiones (p. ej. Card Sorting) sin cuenta, con consentimiento y límite de acceso por proyecto.
- **Comentarios:** discusión sobre los artefactos de un proyecto.

El detalle de permisos está en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/sprints/sprint4-auth-roles.md`](docs/sprints/sprint4-auth-roles.md).

## Estructura del monorepo

```
observatorio-ux/
├── apps/
│   ├── backend/                 # API RESTful (NestJS 12, ESM)
│   │   ├── prisma/              # Esquema, migraciones, seeds y bootstrap-admin
│   │   ├── prisma.config.ts     # Configuración de Prisma 7
│   │   └── src/{core,modules}/  # Infra transversal + slices de dominio
│   │       └── generated/       # Cliente de Prisma (se genera; no se versiona)
│   └── frontend/                # Cliente SPA (React)
│       └── src/{features,layouts,pages,shared}/
├── packages/shared-types/       # Contratos DTO compartidos Frontend/Backend
├── tests/{e2e,load}/            # Playwright (E2E) y k6 (carga)
├── deploy/nginx/                # Configuración del proxy productivo
├── postman/                     # Colecciones Postman para pruebas manuales
├── docs/                        # Documentación técnica y académica
├── SECURITY.md                  # Política de seguridad
└── CHANGELOG.md
```

## Instalación y despliegue local

Guía detallada del backend en [`docs/BACKEND.md`](docs/BACKEND.md).

**Requisitos:** Docker + Docker Compose, Git. Para correr sin Docker: Node.js ≥ 24, pnpm 10.34.5 y PostgreSQL 15+.

### 1. Clonar el repositorio

```bash
git clone https://github.com/tvasquezm/observatorio-ux.git
cd observatorio-ux
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo de la **raíz del proyecto** a `.env` (es el que lee Docker Compose vía `env_file`):

```bash
cp env.example .env
```

Los valores por defecto ya funcionan para desarrollo local con Docker (incluye `DATABASE_URL` apuntando al servicio `db` interno) — no necesitas editar nada para el primer arranque. `NODE_ENV=development` viene seteado explícito a propósito: sin esa variable la aplicación no arranca (ver `docs/ARCHITECTURE.md` sobre por qué se decidió así).

> ⚠️ No confundir con `apps/backend/.env.example` ni `apps/frontend/.env.example` — esos son solo para quien corra esos servicios de forma individual fuera de Docker.

### 3. Levantar todo con Docker Compose

```bash
docker compose up --build
```

Esto, en orden: construye las imágenes de `shared-types`, `backend` y `frontend`; levanta `db` (Postgres) y espera su healthcheck; compila `shared-types` en modo watch; aplica migraciones de Prisma; y levanta el frontend con Vite. El seed no se ejecuta al reiniciar para conservar cuentas y proyectos existentes. Para crear los datos demo, ejecuta `docker compose exec backend pnpm --filter backend seed` o activa explícitamente `SEED_ON_START=true` en desarrollo. En producción nunca se ejecuta el seed automático.

Después de un `git pull` que cambie dependencias (`pnpm-lock.yaml`), basta `docker compose up`: cada servicio detecta el cambio al arrancar y reinstala solo lo suyo. Si un `node_modules` sigue inconsistente, ejecuta `docker compose down` y luego `docker compose up --build -V` para recrear los volúmenes de dependencias.

- Backend: `http://localhost:3000/api` (Swagger en `/api/docs`)
- Frontend: `http://localhost:5173`

Para bajar todo (incluyendo volúmenes de datos, útil para partir de cero):

```bash
docker compose down -v
```

<details>
<summary>Alternativa sin Docker (Node.js 24+, pnpm 10.34.5, PostgreSQL 15+ local)</summary>

```bash
pnpm install

# Configura apps/backend/.env con tu propia DATABASE_URL local
cp apps/backend/.env.example apps/backend/.env

# Genera el cliente de Prisma en apps/backend/src/generated/prisma (no se versiona;
# hay que regenerarlo tras clonar y tras cambiar schema.prisma)
pnpm --filter backend exec prisma generate

# Aplica migraciones (usa "migrate deploy", no "migrate dev", para replicar el mismo comportamiento que Docker)
pnpm --filter backend exec prisma migrate deploy

# Datos demo (ver docs/BACKEND.md); solo en desarrollo
pnpm --filter backend run seed
pnpm --filter backend run seed:usuario      # usuario DOCENTE demo
pnpm --filter backend run bootstrap:admin   # primer administrador (también en producción)

# Backend (http://localhost:3000/api)
pnpm --filter backend start:dev

# Frontend (http://localhost:5173), en otra terminal
pnpm --filter frontend dev
```
</details>

### Despliegue productivo

El stack productivo sirve frontend y API desde un único puerto y no ejecuta
datos demo. La guía completa está en
[`docs/sprints/sprint6-despliegue.md`](docs/sprints/sprint6-despliegue.md).

```bash
cp env.production.example .env.production
# Reemplazar secretos, contraseña, DATABASE_URL y CORS_ORIGIN.
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build --wait --wait-timeout 180
```

Con el puerto predeterminado, la aplicación queda en `http://localhost:8080`.
Para publicación real se requiere HTTPS delante de Nginx.

## Testing

```bash
pnpm --filter backend test        # pruebas unitarias del backend
pnpm --filter frontend test       # componentes, hooks y permisos del frontend
pnpm -r test                      # corre las pruebas de todos los workspaces
```

Las pruebas E2E cubren el recorrido `login → proyecto → 5 técnicas`, la
restricción de Analítica para estudiantes y la ausencia de desbordamiento en
escritorio (1440×900) y móvil táctil (390×844):

```bash
docker compose up -d db           # Playwright prepara migraciones y seed
# Solo la primera vez: crea la base aislada que usa el recorrido E2E
docker compose exec db psql -U postgres -d postgres -c "CREATE DATABASE observatorio_ux_e2e"
pnpm exec playwright install chromium  # solo la primera vez
pnpm test:e2e                     # escritorio + móvil
pnpm test:e2e:mobile              # solo viewport móvil
pnpm test:e2e:desktop             # solo escritorio
```

Playwright usa por defecto los puertos 5174/3001 y la base `observatorio_ux_e2e`.
Si se configuran `E2E_BASE_URL` y `E2E_BACKEND_URL`, puede reutilizar servidores de prueba existentes. El seed exige una base cuyo nombre termine en `_e2e` o `_test`.
En CI levanta ambos servicios, ejecuta las pruebas y conserva capturas, video y
trace cuando hay una falla.

## CI

Cada `push` a `main` y cada Pull Request disparan un workflow de GitHub
Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) con tres jobs:

- `dependency-audit`: `pnpm audit --audit-level high`.
- `build-and-test`: contra un Postgres real, build de `shared-types`, `prisma generate` + `migrate deploy`, validación de scripts de arranque, tests del backend y frontend, build del frontend y E2E responsive (escritorio + móvil).
- `deployment-smoke`: construye y levanta el stack productivo desde cero y verifica frontend, proxy y API.

Dependabot ignora los saltos mayores de `@nestjs/*`; esos se hacen por fases ([`.github/dependabot.yml`](.github/dependabot.yml)). No requiere ninguna acción manual — se ve en la pestaña
**Actions** del repo, o como check ✅/❌ directo en la página del Pull Request.
Si falla, el log de cada paso está ahí mismo.

## Documentación adicional

**Logs maestros** (ver `docs/sprints/GUIA-IA-DOCUMENTACION.md` para el criterio de cuándo actualizar cada uno):
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — decisiones de arquitectura por sprint, mecanismos (versionado append-only, bloqueo pesimista), y hallazgos/correcciones de auditoría técnica
- [`docs/AUDIT_LOG.md`](docs/AUDIT_LOG.md) — tabla de hallazgos de auditoría/bugs y su corrección
- [`docs/CAMBIOS.md`](docs/CAMBIOS.md) — changelog granular, archivo por archivo modificado

**Guías de referencia:**

- [`docs/integracion-card-sorting-momentos-criticos.md`](docs/integracion-card-sorting-momentos-criticos.md) — comparación de los PR #27/#28, unificación de Card Sorting, mejoras de Momentos Críticos y verificaciones
- [`docs/BACKEND.md`](docs/BACKEND.md) — guía de arranque del backend y flujo completo de autenticación/artefactos
- [`docs/ONBOARDING-FRONTEND.md`](docs/ONBOARDING-FRONTEND.md) — guía de arranque para `apps/frontend`
- [`docs/COMANDOS.md`](docs/COMANDOS.md) — referencia rápida de todos los comandos del proyecto
- [`docs/comandos-backend.md`](docs/comandos-backend.md) — flujo de backend sin Docker (Node/pnpm local)
- [`docs/Guia_Prueba_E2E_Card_Sorting_Participantes.md`](docs/Guia_Prueba_E2E_Card_Sorting_Participantes.md) — prueba E2E de Card Sorting con participantes
- [`docs/deuda-tecnica-heuristica.md`](docs/deuda-tecnica-heuristica.md) — registro histórico de deuda técnica del módulo de Evaluación Heurística (03/08/2026) — la mayoría de esos ítems ya están resueltos, revisar `ARCHITECTURE.md` para el estado vigente
- [`docs/PLAN_AJUSTES.md`](docs/PLAN_AJUSTES.md) — plan de ajustes por fases (salas, equipos, comentarios, permisos, módulo admin) y su bitácora
- [`docs/deuda-tecnica.md`](docs/deuda-tecnica.md) — deuda técnica vigente
- [`docs/UX_UI_IMPROVEMENTS.md`](docs/UX_UI_IMPROVEMENTS.md) — mejoras de UX/UI
- [`docs/retroalimentacion-profesores.md`](docs/retroalimentacion-profesores.md) — retroalimentación de profesores
- [`docs/CAMBIOS-Y-VERIFICACION.md`](docs/CAMBIOS-Y-VERIFICACION.md) — cambios y verificaciones
- [`docs/dudas-profesor.md`](docs/dudas-profesor.md) — dudas y pendientes que dependen de información que solo puede confirmar el profesor (incluye D7 y R4)

**Registros por sprint** (`docs/sprints/`):
- [`docs/sprints/GUIA-IA-DOCUMENTACION.md`](docs/sprints/GUIA-IA-DOCUMENTACION.md) — convenciones para asistentes de IA (nomenclatura, vocabulario técnico, qué doc actualizar)
- [`docs/sprints/sprint3-herramientas-ux.md`](docs/sprints/sprint3-herramientas-ux.md) — Sprint 3, Persona/Journey Map/Momentos Críticos
- [`docs/sprints/sprint4-auth-roles.md`](docs/sprints/sprint4-auth-roles.md) — Sprint 4, roles + segregación de auth
- [`docs/sprints/sprint4-referencias-marco-teorico.md`](docs/sprints/sprint4-referencias-marco-teorico.md) — referencias complementarias y texto puente para el capítulo 2
- [`docs/sprints/sprint5-panel-administrativo.md`](docs/sprints/sprint5-panel-administrativo.md) — alcance, decisiones y estado verificable del panel administrativo
- [`docs/sprints/sprint5-pauta-evaluacion-usabilidad.md`](docs/sprints/sprint5-pauta-evaluacion-usabilidad.md) — pauta borrador lista para revisión del profesor
- [`docs/sprints/sprint6-despliegue.md`](docs/sprints/sprint6-despliegue.md) — despliegue productivo reproducible, operación y estado F1–F8/R6
- [`docs/sprints/sprint7.md`](docs/sprints/sprint7.md) — exportación PDF/JSON por proyecto, datos incluidos y permisos
- [`docs/sprints/remediacion-auditoria-2026-09-24.md`](docs/sprints/remediacion-auditoria-2026-09-24.md) — plan de remediación de la auditoría del 24/09/2026

- [`postman/`](postman/) — colecciones Postman por módulo (token de prueba vía `/auth/test-token`, deshabilitado automáticamente cuando `NODE_ENV=production`)

## Licencia

Sin licencia declarada aún (por defecto, todos los derechos reservados). Pendiente de definición como equipo.

## Autoría y contexto académico

- **Autores:** Dreller, Nicolás Exequiel · Gómez Moya, Benjamín Alberto · Vásquez Madrid, Tomás Nelson
- **Profesor guía:** Méndez Sánchez, Ronald Enrique
- **Institución:** UTEM — Facultad de Ingeniería, Escuela de Informática y Computación
- **Contexto:** Trabajo de título para el Observatorio UX para la Inclusión Social, Santiago, Chile (marzo–diciembre 2026)