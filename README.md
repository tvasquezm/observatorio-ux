# 🔬 Observatorio UX - Plataforma SaaS de Investigación UX

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Plataforma de software como servicio (SaaS) orientada a la ejecución, gestión y análisis matemático de metodologías de investigación en Experiencia de Usuario (UX).

Este proyecto constituye el trabajo de título para la carrera de **Ingeniería en Computación** en la **Universidad Tecnológica Metropolitana (UTEM)**, enfocado en resolver la trazabilidad, fragmentación y análisis algorítmico de datos de usabilidad mediante una arquitectura escalable.

## Tabla de contenidos

- [Arquitectura del sistema](#🏗️-arquitectura-del-sistema)
- [Metodologías implementadas](#🚀-metodologías-implementadas)
- [Stack tecnológico](#🛠️-stack-tecnológico)
- [Estructura del monorepo](#📂-estructura-del-monorepo)
- [Configuración y despliegue local](#⚙️-configuración-y-despliegue-local)

## 🏗️ Arquitectura del Sistema

El proyecto está estructurado como un **Monorepo** y diseñado bajo el patrón de **Arquitectura de Slices Verticales** (Vertical Slicing), garantizando bajo acoplamiento y alta cohesión entre dominios.

- `apps/backend/`: API RESTful en NestJS.
  - `core/`: Capa transversal de infraestructura (Auth, Base de Datos, Versionado Pesimista de artefactos).
  - `modules/`: Silos independientes por metodología (ej. Card Sorting, Journey Maps). Regla de oro: ninguna metodología importa código de otra.
- `apps/frontend/`: Cliente web SPA en React.
  - `shared/`: Componentes UI base, hooks globales y utilidades.
  - `features/`: Lógica de negocio e interfaces aisladas por metodología, en espejo 1 a 1 con `modules/` del backend.

### Diseño de interfaz: *Academic Minimalism*

La interfaz de usuario implementa un sistema de diseño propio denominado *Academic Minimalism*, enfocado en reducir la carga cognitiva del investigador mediante paletas monocromáticas (escala de grises), tipografía optimizada para lectura de datos densos, y el uso estratégico de un "Azul Académico" (Indigo) para dirigir la atención transaccional.

## 🚀 Metodologías Implementadas

### 1. Card Sorting (Arquitectura de la Información)

- **Gestión de sesiones:** flujos separados y seguros para Evaluadores (autenticados vía JWT) y Participantes anónimos (validados por consentimiento informado, sin cuenta de usuario).
- **Modelo de datos en 3FN:** esquema relacional estructurado en entidades individuales (`Card`, `Category`, `CardGrouping`) que aseguran la integridad matemática de los resultados — sin depender de blobs JSON sueltos.
- **Quick Assignment UI:** paradigma de interacción dual. *Drag and drop* nativo para entornos de escritorio, y modo *swipe/tap* responsivo para minimizar la fricción en dispositivos móviles.
- **Motor analítico (en desarrollo):** procesamiento de matrices de co-ocurrencia N×N y agrupamiento jerárquico (dendrogramas) para visualización de similitud cruzada.

### 2. UX Artifacts — Personas, Journey Maps, Momentos Críticos

- **Versionado append-only:** cada edición crea una nueva fila versionada en vez de sobrescribir, preservando el historial completo del artefacto.
- **Bloqueo pesimista con TTL:** evita ediciones concurrentes destructivas sin depender de infraestructura adicional (Redis, WebSockets) — el lock vive en la propia fila de base de datos y expira solo.

## 🛠️ Stack Tecnológico

- **Backend:** NestJS, Prisma ORM, PostgreSQL, validación con Zod (`nestjs-zod`).
- **Frontend:** React (Vite), TypeScript, Zustand (estado local), TanStack Query (estado de servidor), Tailwind CSS.
- **Infraestructura de datos:** bloqueo pesimista (*pessimistic locking*) para concurrencia de edición de artefactos; constraints de integridad a nivel de base de datos (ej. `@@unique`) en vez de depender solo de validación de aplicación.

## 📂 Estructura del Monorepo

> **Nota:** `packages/shared-types/` está marcado como *planeado* — hoy los tipos se mantienen sincronizados a mano entre los DTOs Zod del backend y los tipos TypeScript del frontend. Si ya existe en tu repo, avísame para reflejarlo como implementado y documentar su convención de uso.

### 📂 Estructura del Monorepo

observatorio-ux/
├── apps/
│   ├── backend/                # API RESTful (NestJS)
│   │   ├── prisma/             # Esquema relacional y migraciones (3FN)
│   │   └── src/
│   │       ├── core/           # Infraestructura transversal (Auth, Database, Locks)
│   │       └── modules/        # Metodologías aisladas (Slices: card-sorting, artifacts)
│   │
│   └── frontend/               # Cliente SPA (React)
│       ├── public/
│       └── src/
│           ├── features/       # Lógica y UI aislada por metodología (Slices)
│           ├── layouts/        # Contenedores visuales principales
│           ├── pages/          # Enrutamiento principal de la aplicación
│           └── shared/         # Hooks, utilidades y UI base (Academic Minimalism)
│
├── packages/
│   └── shared-types/           # Contratos DTO compartidos Frontend/Backend implementados
│       └── src/
│           ├── common/         # Tipos genéricos (ej. respuestas HTTP)
│           └── domains/        # Interfaces específicas por metodología
│
└── docs/                       # Documentación técnica y académica

## ⚙️ Configuración y Despliegue Local

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

<!-- AJUSTA ESTOS NOMBRES DE VARIABLES a los reales de tu env.validation.ts —
     no los pude confirmar sin ver ese archivo. -->
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/observatorio_ux"
JWT_SECRET="reemplaza-esto-por-un-secreto-real"
JWT_EXPIRATION="1d"
```

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