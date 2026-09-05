# 🔬 Observatorio UX — Plataforma SaaS de Investigación UX

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

[![CI](https://github.com/tvasquezm/observatorio-ux/actions/workflows/ci.yml/badge.svg)](https://github.com/tvasquezm/observatorio-ux/actions/workflows/ci.yml)

Plataforma SaaS para la ejecución, gestión y análisis matemático de metodologías de investigación en Experiencia de Usuario (UX), desarrollada para el **Observatorio UX para la Inclusión Social** de la Universidad Tecnológica Metropolitana (UTEM).

Trabajo de título de **Ingeniería en Computación (UTEM)**. Centraliza en un solo lugar cinco metodologías de UX Research —Evaluación Heurística, Card Sorting, Perfil de Persona, Journey Map y Mapa de Momentos Críticos—, con autenticación por roles, gestión de proyectos y un modelo de datos pensado para el análisis, no solo el almacenamiento.

> **Estado:** en desarrollo activo (Sprint 1 y 2 de 13, ya cerrados). Antes de auditar o contribuir, revisa [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), donde se documentan las decisiones de arquitectura y los hallazgos de auditoría técnica.

## Tabla de contenidos

- [Sobre el proyecto](#sobre-el-proyecto)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Instalación y despliegue local](#instalación-y-despliegue-local)
- [Testing](#testing)
- [CI](#ci)
- [Documentación adicional](#documentación-adicional)
- [Autoría y contexto académico](#autoría-y-contexto-académico)

## Sobre el proyecto

Los equipos de investigación UX suelen trabajar con herramientas fragmentadas (hojas de cálculo, formularios sueltos, notas dispersas), lo que dificulta la trazabilidad y hace inviable un análisis matemático riguroso. Observatorio UX resuelve esto con un modelo de datos único y módulos de reportería comunes (exportación a PDF y JSON) para comparar evidencia entre sesiones y proyectos.

## Arquitectura

Monorepo con **arquitectura de slices verticales** (bajo acoplamiento, alta cohesión):

- `apps/backend/` — API RESTful en NestJS. `core/` = infraestructura transversal (auth, DB, locks). `modules/` = una metodología por slice; **ninguna metodología importa código de otra**.
- `apps/frontend/` — SPA en React. `shared/` = UI base y hooks globales. `features/` = lógica e interfaces por metodología, en espejo 1:1 con `modules/`.

La interfaz usa un sistema de diseño propio, **Academic Minimalism**: paleta monocromática en grises + un "Azul Académico" (Indigo) reservado para acciones transaccionales.

> Toda la API usa **un solo idioma para las rutas: inglés** (`/api/projects`, `/api/projects/:id/artifacts` y `/api/projects/:id/evaluacion-heuristica/...`). Ver `docs/ARCHITECTURE.md` §5.

## Stack tecnológico

- **Backend:** NestJS, Prisma ORM, PostgreSQL, validación con Zod (`nestjs-zod`)
- **Frontend:** React (Vite), TypeScript, Zustand, TanStack Query, Tailwind CSS
- **Concurrencia:** bloqueo pesimista con TTL para edición de artefactos (`POST`/`DELETE .../artifacts/:id/lock`) + constraints a nivel de base de datos
- **Infra de desarrollo:** Docker Compose (`db`, `shared-types` en watch mode, `backend`, `frontend`)
- **Reportería:** PDF por proyecto + exportación JSON (Sprint 7)
- **Pruebas de carga:** k6, objetivo 200 usuarios concurrentes (Sprint 8)

## Estructura del monorepo

```
observatorio-ux/
├── apps/
│   ├── backend/                 # API RESTful (NestJS)
│   │   ├── prisma/              # Esquema relacional y migraciones (3FN)
│   │   └── src/{core,modules}/  # Infra transversal + metodologías aisladas
│   └── frontend/                # Cliente SPA (React)
│       └── src/{features,layouts,pages,shared}/
├── packages/shared-types/       # Contratos DTO compartidos Frontend/Backend
├── postman/                     # Colecciones Postman para pruebas manuales
├── docs/                        # Documentación técnica y académica
└── CHANGELOG.md
```

## Instalación y despliegue local

Guía detallada del backend en [`docs/BACKEND.md`](docs/BACKEND.md).

**Requisitos:** Docker + Docker Compose, Git.

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

Esto, en orden: construye las imágenes de `shared-types`, `backend` y `frontend`; levanta `db` (Postgres) y espera su healthcheck; compila `shared-types` en modo watch; aplica migraciones de Prisma; corre el seed **solo si `NODE_ENV` no es `production`**; y levanta el frontend con Vite.

- Backend: `http://localhost:3000/api` (Swagger en `/api/docs`)
- Frontend: `http://localhost:5173`

Para bajar todo (incluyendo volúmenes de datos, útil para partir de cero):

```bash
docker compose down -v
```

<details>
<summary>Alternativa sin Docker (Node.js 20+, pnpm 9+, PostgreSQL 15+ local)</summary>

```bash
pnpm install

# Configura apps/backend/.env con tu propia DATABASE_URL local
cp apps/backend/.env.example apps/backend/.env

# Genera el cliente de Prisma
pnpm --filter backend exec prisma generate

# Aplica migraciones (usa "migrate deploy", no "migrate dev", para replicar el mismo comportamiento que Docker)
pnpm --filter backend exec prisma migrate deploy

# Corre el seed (crea un usuario demo — ver docs/BACKEND.md)
pnpm --filter backend run seed

# Backend (http://localhost:3000/api)
pnpm --filter backend start:dev

# Frontend (http://localhost:5173), en otra terminal
pnpm --filter frontend dev
```
</details>

## Testing

```bash
pnpm --filter backend test        # unitarios (57 tests, 6 suites — en verde)
pnpm -r test                      # corre "test" en todos los workspaces que lo definan
```

> ⚠️ Todavía no existen tests e2e (`test:e2e`) ni tests de frontend — son parte del
> backlog pendiente, no scripts ya implementados. Antes de correr `pnpm -r test`
> desde la raíz, tené en cuenta que solo `apps/backend` define ese script hoy;
> `apps/frontend` y `packages/shared-types` no lo tienen todavía.
>
> Cobertura actualmente mínima en varios módulos — ampliarla es parte del backlog.

## CI

Cada `push` a `main` y cada Pull Request disparan un workflow de GitHub
Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) que corre,
contra un Postgres real: build de `shared-types`, `prisma generate` +
`migrate deploy`, los tests del backend, y el build del frontend. No requiere
ninguna acción manual — se ve en la pestaña **Actions** del repo, o como
check ✅/❌ directo en la página del Pull Request. Si falla, el log de cada
paso está ahí mismo.

## Documentación adicional

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — decisiones de arquitectura por sprint, mecanismos (versionado append-only, bloqueo pesimista), y hallazgos/correcciones de auditoría técnica
- [`docs/BACKEND.md`](docs/BACKEND.md) — guía de arranque del backend y flujo completo de autenticación/artefactos
- [`docs/deuda-tecnica-heuristica.md`](docs/deuda-tecnica-heuristica.md) — registro histórico de deuda técnica detectada en el módulo de Evaluación Heurística (03/08/2026) — la mayoría de esos ítems ya están resueltos, revisar `ARCHITECTURE.md` para el estado vigente
- [`postman/`](postman/) — colecciones Postman por módulo (token de prueba vía `/auth/test-token`, deshabilitado automáticamente cuando `NODE_ENV=production`)

## Licencia

Sin licencia declarada aún (por defecto, todos los derechos reservados). Pendiente de definición como equipo.

## Autoría y contexto académico

- **Autores:** Dreller, Nicolás Exequiel · Gómez Moya, Benjamín Alberto · Vásquez Madrid, Tomás Nelson
- **Profesor guía:** Méndez Sánchez, Ronald Enrique
- **Institución:** UTEM — Facultad de Ingeniería, Escuela de Informática y Computación
- **Contexto:** Trabajo de título para el Observatorio UX para la Inclusión Social, Santiago, Chile (marzo–diciembre 2026)
