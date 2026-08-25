# 🔬 Observatorio UX — Plataforma SaaS de Investigación UX

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Plataforma SaaS para la ejecución, gestión y análisis matemático de metodologías de investigación en Experiencia de Usuario (UX), desarrollada para el **Observatorio UX para la Inclusión Social** de la Universidad Tecnológica Metropolitana (UTEM).

Trabajo de título de **Ingeniería en Computación (UTEM)**. Centraliza en un solo lugar cinco metodologías de UX Research —Evaluación Heurística, Card Sorting, Perfil de Persona, Journey Map y Mapa de Momentos Críticos—, con autenticación por roles, gestión de proyectos y un modelo de datos pensado para el análisis, no solo el almacenamiento.

> **Estado:** en desarrollo activo (Sprint 1 de 13). Antes de auditar o contribuir, revisa [`docs/ESTADO-TECNICO.md`](docs/ESTADO-TECNICO.md), donde se documenta la deuda técnica conocida.

## Tabla de contenidos

- [Sobre el proyecto](#sobre-el-proyecto)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Instalación y despliegue local](#instalación-y-despliegue-local)
- [Testing](#testing)
- [Documentación adicional](#documentación-adicional)
- [Autoría y contexto académico](#autoría-y-contexto-académico)

## Sobre el proyecto

Los equipos de investigación UX suelen trabajar con herramientas fragmentadas (hojas de cálculo, formularios sueltos, notas dispersas), lo que dificulta la trazabilidad y hace inviable un análisis matemático riguroso. Observatorio UX resuelve esto con un modelo de datos único y módulos de reportería comunes (exportación a PDF y JSON) para comparar evidencia entre sesiones y proyectos.

## Arquitectura

Monorepo con **arquitectura de slices verticales** (bajo acoplamiento, alta cohesión):

- `apps/backend/` — API RESTful en NestJS. `core/` = infraestructura transversal (auth, DB, locks). `modules/` = una metodología por slice; **ninguna metodología importa código de otra**.
- `apps/frontend/` — SPA en React. `shared/` = UI base y hooks globales. `features/` = lógica e interfaces por metodología, en espejo 1:1 con `modules/`.

La interfaz usa un sistema de diseño propio, **Academic Minimalism**: paleta monocromática en grises + un "Azul Académico" (Indigo) reservado para acciones transaccionales.

## Stack tecnológico

- **Backend:** NestJS, Prisma ORM, PostgreSQL, validación con Zod (`nestjs-zod`)
- **Frontend:** React (Vite), TypeScript, Zustand, TanStack Query, Tailwind CSS
- **Concurrencia:** bloqueo pesimista para edición de artefactos + constraints a nivel de base de datos
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
├── postman/                     # Colección Postman para pruebas manuales
├── docs/                        # Documentación técnica y académica
└── CHANGELOG.md
```

## Instalación y despliegue local

Guía detallada del backend en [`docs/BACKEND.md`](docs/BACKEND.md).

> ⚠️ El build de `shared-types` está roto actualmente — revisa [`docs/ESTADO-TECNICO.md`](docs/ESTADO-TECNICO.md) antes de levantar el proyecto.

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

Los valores por defecto ya funcionan para desarrollo local con Docker (incluye `DATABASE_URL` apuntando al servicio `db` interno) — no necesitas editar nada para el primer arranque.

> ⚠️ No confundir con `apps/backend/.env.example` ni `apps/frontend/.env.example` — esos son solo para quien corra esos servicios de forma individual fuera de Docker.

### 3. Levantar todo con Docker Compose

```bash
docker compose up --build
```

Esto, en orden: construye las imágenes de `shared-types`, `backend` y `frontend`; levanta `db` (Postgres) y espera su healthcheck; compila `shared-types` en modo watch; aplica migraciones de Prisma y corre el seed; y levanta el frontend con Vite.

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

# Aplica migraciones (usa "migrate deploy", no "migrate dev", para replicar el mismo comportamiento que Docker)
pnpm --filter backend exec prisma migrate deploy

# Backend (http://localhost:3000/api)
pnpm --filter backend start:dev

# Frontend (http://localhost:5173), en otra terminal
pnpm --filter frontend dev
```
</details>

## Testing

```bash
pnpm --filter backend test        # unitarios
pnpm --filter backend test:e2e    # end-to-end
pnpm --filter frontend test
pnpm -r test                      #(backend + frontend) de una vez
```

> Cobertura actualmente mínima en varios módulos — ampliarla es parte del backlog de Sprint 1 y 2 (ver [`docs/ROADMAP.md`](docs/ROADMAP.md)).

## Documentación adicional

- [`docs/ESTADO-TECNICO.md`](docs/ESTADO-TECNICO.md) — deuda técnica y estado real de cada módulo
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — roadmap completo por sprint y backlog detallado (140+ tareas)
- [`docs/BACKEND.md`](docs/BACKEND.md) — guía de arranque del backend
- [`postman/`](postman/) — colección Postman (token de prueba vía `/auth/test-token`, actualmente sin proteger — no usar contra una instancia expuesta públicamente)

## Licencia

Sin licencia declarada aún (por defecto, todos los derechos reservados). Pendiente de definición como equipo.

## Autoría y contexto académico

- **Autores:** Dreller, Nicolás Exequiel · Gómez Moya, Benjamín Alberto · Vásquez Madrid, Tomás Nelson
- **Profesor guía:** Méndez Sánchez, Ronald Enrique
- **Institución:** UTEM — Facultad de Ingeniería, Escuela de Informática y Computación
- **Contexto:** Trabajo de título para el Observatorio UX para la Inclusión Social, Santiago, Chile (marzo–diciembre 2026)