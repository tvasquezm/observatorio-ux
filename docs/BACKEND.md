# Backend funcional

## Requisitos

- Node.js 20 o superior
- pnpm 9 o superior
- Docker Desktop para PostgreSQL

## Puesta en marcha

Desde la raíz del repositorio:

```bash
pnpm install
Copy-Item apps/backend/.env.example apps/backend/.env
docker compose up -d
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:deploy
pnpm --filter backend seed
pnpm --filter backend start:dev
```

La API queda disponible en `http://localhost:3000/api` y Swagger en
`http://localhost:3000/api/docs`. El chequeo básico es `GET /api/health`.

El usuario creado por el seed es:

```text
email: evaluador@ux.utem.cl
password: Demo1234!
```

## Flujo de autenticación

1. `POST /api/auth/login` con `email` y `password` para obtener un token de evaluador.
2. Usar el token como `Authorization: Bearer <token>`.
3. Crear o consultar proyectos desde `/api/projects`.
4. Crear una sesión Card Sorting desde `POST /api/card-sorting/sessions`.
5. Para un participante, solicitar `POST /api/auth/participants/token` con `participanteId` y `proyectoId`.
6. Usar ese token en `POST /api/card-sorting/sessions/:id/join`.
7. Enviar los resultados con `POST /api/card-sorting/sessions/:id/results`.

En desarrollo también existen `GET /api/auth/test-token` y
`GET /api/auth/test-participant-token`, que generan tokens a partir de los datos
creados por el seed. Esos endpoints quedan deshabilitados en producción.

Para probar el flujo completo en Postman puedes importar
`postman/backend-functional.postman_collection.json`.

## Evaluación heurística

Las rutas son:

```text
POST  /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones
PATCH /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/hallazgos
GET   /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones/:sesionId
POST  /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/finalizar
```

Solo el evaluador dueño del proyecto puede modificar o finalizar sus sesiones,
salvo un usuario con rol `ADMIN`.

## Artefactos UX

Los tres módulos de artefactos utilizan el modelo versionado `UxArtifact`:

```text
POST /api/proyectos/:proyectoId/artefactos
GET  /api/proyectos/:proyectoId/artefactos
GET  /api/proyectos/:proyectoId/artefactos/:artefactoId
POST /api/proyectos/:proyectoId/artefactos/:artefactoId/versions
```

Los valores admitidos para `tipo` son `PERSONA`, `JOURNEY_MAP` y
`MOMENTOS_CRITICOS`. El campo `contenido` es JSON y permite que cada técnica
conserve su estructura específica. Las nuevas versiones se almacenan como
registros append-only asociados al mismo `artefactoLogicoId`.

Para probar estos endpoints se puede importar
`postman/ux-artifacts.postman_collection.json`.
