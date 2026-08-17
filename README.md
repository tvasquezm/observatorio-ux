# 🔬 Observatorio UX — Plataforma SaaS de Investigación UX

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Plataforma de software como servicio (SaaS) orientada a la ejecución, gestión y análisis matemático de metodologías de investigación en Experiencia de Usuario (UX).

Este proyecto constituye el trabajo de título para la carrera de **Ingeniería en Computación** en la **Universidad Tecnológica Metropolitana (UTEM)**, enfocado en resolver la trazabilidad y fragmentación de los datos de usabilidad, y en habilitar su análisis algorítmico mediante una arquitectura escalable.

## Tabla de contenidos

- [Sobre el proyecto](#sobre-el-proyecto)
- [Estado del proyecto](#estado-del-proyecto)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Metodologías implementadas](#metodologías-implementadas)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Configuración y despliegue local](#configuración-y-despliegue-local)

## Sobre el proyecto

Los equipos de investigación UX suelen trabajar con herramientas fragmentadas (hojas de cálculo, formularios sueltos, notas dispersas) que dificultan la trazabilidad de los datos y hacen inviable cualquier análisis matemático riguroso sobre ellos. Observatorio UX centraliza la ejecución de metodologías de investigación —Card Sorting, Personas, Journey Maps— en un solo lugar, con un modelo de datos pensado desde el inicio para el análisis, no solo para el almacenamiento.

## Estado del proyecto

| Módulo | Estado |
|---|---|
| Card Sorting — gestión de sesiones | ✅ Implementado |
| Card Sorting — motor analítico (matrices de co-ocurrencia, dendrogramas) | 🚧 En desarrollo |
| UX Artifacts — Personas, Journey Maps, Momentos Críticos | ✅ Implementado |
| `packages/shared-types` (contratos DTO compartidos) | ✅ Implementado |

## Arquitectura del sistema

El proyecto está estructurado como un **monorepo** y diseñado bajo el patrón de **arquitectura de slices verticales** (vertical slicing), garantizando bajo acoplamiento y alta cohesión entre dominios.

- `apps/backend/`: API RESTful en NestJS.
  - `core/`: capa transversal de infraestructura (autenticación, base de datos, bloqueo pesimista de artefactos).
  - `modules/`: silos independientes por metodología (p. ej. Card Sorting, Journey Maps). Regla de oro: ninguna metodología importa código de otra.
- `apps/frontend/`: cliente web SPA en React.
  - `shared/`: componentes UI base, hooks globales y utilidades.
  - `features/`: lógica de negocio e interfaces aisladas por metodología, en espejo 1:1 con `modules/` del backend.

### Diseño de interfaz: *Academic Minimalism*

La interfaz implementa un sistema de diseño propio llamado *Academic Minimalism*, enfocado en reducir la carga cognitiva del investigador: paleta monocromática en escala de grises, tipografía optimizada para lectura de datos densos, y un "Azul Académico" (Indigo) reservado para dirigir la atención hacia acciones transaccionales.

## Metodologías implementadas

### 1. Card Sorting (Arquitectura de la Información)

- **Gestión de sesiones:** flujos separados y seguros para evaluadores (autenticados vía JWT) y participantes anónimos (validados por consentimiento informado, sin cuenta de usuario).
- **Modelo de datos en 3FN:** esquema relacional estructurado en entidades individuales (`Card`, `Category`, `CardGrouping`) que asegura la integridad matemática de los resultados, sin depender de blobs JSON sueltos.
- **Quick Assignment UI:** paradigma de interacción dual — *drag and drop* nativo en escritorio, y modo *swipe/tap* responsivo para minimizar la fricción en dispositivos móviles.
- **Motor analítico (en desarrollo):** procesamiento de matrices de co-ocurrencia N×N y agrupamiento jerárquico (dendrogramas) para visualizar similitud cruzada entre tarjetas.

### 2. UX Artifacts — Personas, Journey Maps, Momentos Críticos

- **Versionado append-only:** cada edición crea una nueva fila versionada en vez de sobrescribir, preservando el historial completo del artefacto.
- **Bloqueo pesimista con TTL:** evita ediciones concurrentes destructivas sin depender de infraestructura adicional (Redis, WebSockets); el lock vive en la propia fila de base de datos y expira automáticamente.

## Stack tecnológico

- **Backend:** NestJS, Prisma ORM, PostgreSQL, validación con Zod (`nestjs-zod`).
- **Frontend:** React (Vite), TypeScript, Zustand (estado local), TanStack Query (estado de servidor), Tailwind CSS.
- **Infraestructura de datos:** bloqueo pesimista (*pessimistic locking*) para concurrencia de edición de artefactos; constraints de integridad a nivel de base de datos (p. ej. `@@unique`) en vez de depender solo de validación de aplicación.

## Estructura del monorepo

```
observatorio-ux/
├── apps/
│   ├── backend/                # API RESTful (NestJS)
│   │   ├── prisma/             # Esquema relacional y migraciones (3FN)
│   │   └── src/
│   │       ├── core/           # Infraestructura transversal (Auth, Database, Locks)
│   │       └── modules/        # Metodologías aisladas (slices: card-sorting, artifacts)
│   │
│   └── frontend/               # Cliente SPA (React)
│       ├── public/
│       └── src/
│           ├── features/       # Lógica y UI aislada por metodología (slices)
│           ├── layouts/        # Contenedores visuales principales
│           ├── pages/          # Enrutamiento principal de la aplicación
│           └── shared/         # Hooks, utilidades y UI base (Academic Minimalism)
│
├── packages/
│   └── shared-types/           # Contratos DTO compartidos Frontend/Backend (implementado)
│       └── src/
│           ├── common/         # Tipos genéricos (ej. respuestas HTTP)
│           └── domains/        # Interfaces específicas por metodología
│
└── docs/                       # Documentación técnica y académica
```

## Configuración y despliegue local

La guía específica del backend está en [`docs/BACKEND.md`](docs/BACKEND.md).

### Prerrequisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ corriendo localmente (o accesible vía `DATABASE_URL`)

### 1. Clonar e instalar dependencias del monorepo

```bash
git clone <url-del-repositorio>
cd observatorio-ux
pnpm install
```

### 2. Configurar variables de entorno

Crea `apps/backend/.env` a partir del ejemplo del repositorio (ajusta los valores según tu entorno local):

```bash
cp apps/backend/.env.example apps/backend/.env
```

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/observatorio_ux"
JWT_SECRET="reemplaza-esto-por-un-secreto-real"
JWT_EXPIRATION="1d"
```

> ⚠️ Verifica estos nombres contra tu `env.validation.ts`: los dejé como referencia razonable, pero no pude confirmarlos sin ver ese archivo.

### 3. Ejecutar migraciones de Prisma

```bash
pnpm --filter backend exec prisma migrate dev
```

### 4. Levantar los servidores de desarrollo

```bash
# Backend (http://localhost:3000/api)
pnpm --filter backend start:dev

# Frontend (http://localhost:5173)
pnpm --filter frontend dev
```
