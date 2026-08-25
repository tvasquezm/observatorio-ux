# Backend funcional

## Requisitos

- Docker Desktop

No necesitas Node.js ni pnpm instalados localmente — todo corre dentro de los contenedores.

## Puesta en marcha

Desde la raíz del repositorio:

```bash
cp .env.example .env
docker compose up --build
```

Esto levanta la base de datos, recompila `packages/shared-types` en watch mode,
y arranca el backend — aplicando migraciones de Prisma y el seed
automáticamente en cada arranque, sin pasos manuales.

La API queda disponible en `http://localhost:3000/api` y Swagger en
`http://localhost:3000/api/docs`. El chequeo básico es `GET /api/health`.

El usuario creado por el seed es:

```text
email: evaluador@ux.utem.cl
password: Demo1234!
```

> Para ver solo los logs del backend: `docker compose logs -f backend`.
> Guía completa de arranque de todo el stack (incluyendo frontend) en el
> [`README.md`](../README.md) de la raíz del proyecto.

## Flujo de autenticación

1. `POST /api/auth/login` con `email` y `password` para obtener un token de evaluador.
2. Usar el token como `Authorization: Bearer <token>`.
3. Crear o consultar proyectos desde `/api/projects`.
4. Cargar participantes autorizados con `POST /api/proyectos/:id/participantes`.
   El cuerpo tiene la forma `{ "participantes": [{ "email": "...", "nombre": "..." }] }`.
5. Crear una sesión Card Sorting desde `POST /api/card-sorting/sessions`.
6. El participante se registra con `POST /api/auth/participants/register`.
7. Registrar su consentimiento con `POST /api/auth/participants/consent` usando
   `participanteId`, `proyectoId`, `aceptado` y `version`.
8. Solicitar `POST /api/auth/participants/token` con `participanteId` y
   `proyectoId`.
9. Usar ese token en `POST /api/card-sorting/sessions/:id/join`.
10. Enviar los resultados con `POST /api/card-sorting/sessions/:id/results`.

El registro exige que el email esté en la whitelist y la emisión del token
vuelve a comprobar esa autorización. La verificación de que la persona controla
el email requiere añadir un mecanismo de invitación o verificación por correo;
el endpoint actual no envía emails por sí solo.

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