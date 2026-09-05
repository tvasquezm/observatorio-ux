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

El seed crea 3 cuentas de estudiante, miembros del mismo proyecto demo
(ver `docs/CAMBIOS.md §Ronda 5` — reemplazan la cuenta única
`evaluador@ux.utem.cl` de versiones anteriores):

```text
email: estudiante1@ux.utem.cl
email: estudiante2@ux.utem.cl
email: estudiante3@ux.utem.cl
password: Demo1234! (las 3 comparten la misma)
```

Contraseña configurable vía `SEED_PASSWORD` en `.env` si no querés usar el
default. Las 3 cuentas tienen acceso al mismo proyecto (`ProyectoMiembro`),
así que sirven para probar edición concurrente y el bloqueo pesimista
entre usuarios distintos.

El seed también crea un usuario **DOCENTE de prueba** (login simple, pensado
para QA manual), con un proyecto propio ("Proyecto Demo Profesor") que ya
trae las 5 técnicas cargadas (Card Sorting, Evaluación Heurística, Persona,
Journey Map, Momentos Críticos):

```text
email: profesor@test.com
password: profesor123
```

Contraseña configurable vía `SEED_PROFESOR_PASSWORD` en `.env` si no querés
usar el default. Ver `apps/backend/prisma/seed.ts`.

> Para ver solo los logs del backend: `docker compose logs -f backend`.
> Guía completa de arranque de todo el stack (incluyendo frontend) en el
> [`README.md`](../README.md) de la raíz del proyecto.

## Flujo de autenticación

1. `POST /api/auth/login` con `email` y `password` para obtener un token de evaluador.
2. Usar el token como `Authorization: Bearer <token>`.
3. Crear o consultar proyectos desde `/api/projects`.
4. Cargar participantes autorizados con `POST /api/projects/:id/participantes`.
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
POST  /api/projects/:proyectoId/evaluacion-heuristica/sesiones
PATCH /api/projects/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/hallazgos
GET   /api/projects/:proyectoId/evaluacion-heuristica/sesiones/:sesionId
POST  /api/projects/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/finalizar
```

Solo el evaluador dueño del proyecto puede modificar o finalizar sus sesiones,
salvo un usuario con rol `ADMIN`.

## Artefactos UX

Los tres módulos de artefactos utilizan el modelo versionado `UxArtifact`:

```text
POST   /api/projects/:proyectoId/artifacts
GET    /api/projects/:proyectoId/artifacts
GET    /api/projects/:proyectoId/artifacts/:artefactoId
POST   /api/projects/:proyectoId/artifacts/:artefactoId/versions
POST   /api/projects/:proyectoId/artifacts/:artefactoId/lock
DELETE /api/projects/:proyectoId/artifacts/:artefactoId/lock
DELETE /api/projects/:proyectoId/artifacts/:artefactoId
```

`DELETE .../:artefactoId` (sin `/lock`) hace soft delete: marca `deletedAt`
en **todas** las versiones del mismo `artefactoLogicoId`, no borra filas.
Requiere que el artefacto no esté bloqueado por otro usuario. `findAll`
excluye por defecto los artefactos con `deletedAt` seteado — no hay
parámetro para incluirlos vía esta ruta.

Los valores admitidos para `tipo` son `PERSONA`, `JOURNEY_MAP` y
`MOMENTOS_CRITICOS`. El campo `contenido` es JSON y permite que cada técnica
conserve su estructura específica. Las nuevas versiones se almacenan como
registros append-only asociados al mismo `artefactoLogicoId`.

Antes de editar un artefacto, adquirir el bloqueo con `POST .../lock`
(TTL configurable vía `ttlSegundos` en el body, default 5 min) y liberarlo
con `DELETE .../lock` al terminar. Ver `docs/ARCHITECTURE.md` §Sprint 2.3.
El frontend ya integra esto en las 3 páginas de artefactos (Persona,
Journey Map, Momentos Críticos): `lock` al iniciar edición, `unlock` al
cancelar o al guardar con éxito, y el formulario queda en solo lectura con
un toast de aviso si el `POST .../lock` devuelve `409` (bloqueado por otro
usuario). Ver `docs/ARCHITECTURE.md` §Sprint 4.

Para probar estos endpoints se puede importar
`postman/ux-artifacts.postman_collection.json`.

## Manejo de errores estandarizado

Toda respuesta de error (400/401/403/404/409/500) tiene la misma forma,
sin importar el módulo:

```json
{
  "statusCode": 400,
  "timestamp": "2026-08-31T21:30:30.873Z",
  "path": "/api/projects/:id/artifacts",
  "message": "...",
  "errorCode": "BAD_REQUEST"
}
```

`message` es un string simple para errores generales (`NotFoundException`,
`ForbiddenException`, etc.), o un array `{ campo, mensaje }[]` cuando el
error viene de una validación — tanto de la forma general del body
(`class-validator` vía `ValidationPipe`) como del contenido específico por
`tipo` de artefacto (Zod, ver §Artefactos UX arriba). Esto permite que un
formulario resalte el input exacto que falló.

Implementado en `GlobalExceptionFilter`
(`apps/backend/src/common/filters/global-exception.filter.ts`), registrado
globalmente en `main.ts`. Ver `docs/ARCHITECTURE.md §Sprint 3` para el
detalle de decisiones y `docs/SESION-CLAUDE-sprint3.md §9` para el registro
de la sesión que lo implementó (incluye un bug real encontrado y corregido:
el filtro inicialmente ignoraba el array estructurado que ya armaba
`artifacts.service.ts`).
