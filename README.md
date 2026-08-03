# 🔬 Observatorio UX - Plataforma SaaS de Investigación UX

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Plataforma de software como servicio (SaaS) orientada a la ejecución, gestión y análisis matemático de metodologías de investigación en Experiencia de Usuario (UX). 

Este proyecto constituye el trabajo de título para la carrera de **Ingeniería en Computación** en la **Universidad Tecnológica Metropolitana (UTEM)**, enfocado en resolver la trazabilidad, fragmentación y análisis algorítmico de datos de usabilidad mediante una arquitectura escalable.

## 🏗️ Arquitectura del Sistema

El proyecto está estructurado como un **Monorepo** y diseñado bajo el patrón de **Arquitectura de Slices Verticales (Vertical Slicing)**, garantizando un bajo acoplamiento y alta cohesión entre dominios.

*   `apps/backend/`: API RESTful en NestJS.
    *   `core/`: Capa transversal de infraestructura (Auth, Base de Datos, Versionado Pesimista).
    *   `modules/`: Silos independientes por metodología metodológica (Ej. Card Sorting, Journey Maps).
*   `apps/frontend/`: Cliente web SPA en React.
    *   `shared/`: Componentes UI base, hooks globales y utilidades.
    *   `features/`: Lógica de negocio e interfaces aisladas por metodología.
*   `packages/shared-types/`: Interfaces de TypeScript compartidas entre cliente y servidor.

### Diseño de Interfaz: *Academic Minimalism*
La interfaz de usuario implementa un sistema de diseño propio denominado *Academic Minimalism*, enfocado en reducir la carga cognitiva del investigador mediante paletas monocromáticas (escala de grises), tipografía optimizada para lectura de datos densos y el uso estratégico de un "Azul Académico" (Indigo) para dirigir la atención transaccional.

## 🚀 Metodologías Implementadas

### 1. Card Sorting (Arquitectura de la Información)
*   **Gestión de Sesiones:** Flujos separados y seguros para Evaluadores (JWT) y Participantes anónimos (validación por consentimiento).
*   **Modelo de Datos (3FN):** Esquema relacional estructurado en entidades individuales (`Card`, `Category`, `CardGrouping`) que aseguran la integridad matemática de los resultados.
*   **Quick Assignment UI:** Paradigma de interacción dual. *Drag and Drop* nativo para entornos de escritorio, y modo *Swipe/Tap* responsivo para minimizar la fricción en dispositivos móviles.
*   **Motor Analítico (En desarrollo):** Procesamiento de matrices de co-ocurrencia $N \times N$ y agrupamiento jerárquico (Dendrogramas) para visualización de similitud cruzada.

## 🛠️ Stack Tecnológico

*   **Backend:** NestJS, Prisma ORM, PostgreSQL.
*   **Frontend:** React, Zustand (Estado Local), TanStack Query (Estado de Servidor), Tailwind CSS, Zod.
*   **Infraestructura:** Bloqueo de artefactos pesimista (Pessimistic Locking) para concurrencia de edición.

## ⚙️ Configuración y Despliegue Local

1. Instalar dependencias del monorepo:
   ```bash
   npm install