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

Cuenta administradora para comprobar las tres perspectivas:

```text
email: admin@test.com
password: admin1234
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

### Participante — acceso público abierto (por defecto, desde Fase 1)

Sin whitelist ni datos personales. Cualquiera con el `proyectoId` (compartido vía
link o QR) puede entrar:

1. `POST /api/auth/participants/access` con `{ "proyectoId": "..." }`. Crea un
   `Participante` sin metadata y devuelve `access_token` + `participant.id`
   directamente — no hay paso de "registro" separado.
2. Registrar su consentimiento con `POST /api/auth/participants/consent` usando
   `participanteId`, `proyectoId`, `aceptado` y `version` (sin `codigoInvitacion`:
   este flujo no usa whitelist). Sigue siendo obligatorio — es requisito legal/
   ético, no un dato de contacto.
3. Usar el `access_token` en `POST /api/card-sorting/sessions/:id/join` — este
   paso vuelve a exigir que exista consentimiento aceptado para el proyecto.
4. Enviar los resultados con `POST /api/card-sorting/sessions/:id/results`.

### Participante — flujo previo con whitelist/email (se mantiene para invitaciones controladas)

Vigente cuando el docente quiere restringir quién participa (p. ej. Evaluación
Heurística con invitaciones nominales):

4. Cargar participantes autorizados con `POST /api/projects/:id/participantes`.
   El cuerpo tiene la forma `{ "participantes": [{ "email": "...", "nombre": "..." }] }`.
   La respuesta incluye un `codigoInvitacion` aleatorio por cada entrada nueva; se muestra
   una sola vez y debe compartirse de forma privada con la persona correspondiente.
5. Crear una sesión Card Sorting desde `POST /api/card-sorting/sessions`.
6. El participante se registra con `POST /api/auth/participants/register`, incluyendo su
   `codigoInvitacion`.
7. Registrar su consentimiento con `POST /api/auth/participants/consent` usando
   `participanteId`, `proyectoId`, `aceptado`, `version` y `codigoInvitacion`.
8. Solicitar `POST /api/auth/participants/token` con `participanteId` y
   `proyectoId` y `codigoInvitacion`.
9. Usar ese token en `POST /api/card-sorting/sessions/:id/join`.
10. Enviar los resultados con `POST /api/card-sorting/sessions/:id/results`.

El registro exige que el email esté en la whitelist y que el código de invitación
coincida con su hash almacenado. El consentimiento y la emisión del token vuelven
a comprobar ambos datos cuando existe una entrada de whitelist asociada; el código
en texto plano nunca se guarda en la base de datos. Si el participante entró por
el acceso abierto (sin whitelist), `POST /api/auth/participants/consent` no exige
ningún código.

En desarrollo también existen `GET /api/auth/test-token` y
`GET /api/auth/test-participant-token`, que generan tokens a partir de los datos
creados por el seed. Esos endpoints quedan deshabilitados en producción.

**Segregación de secretos:** `evaluadorToken` y `participanteToken` se
firman con secretos distintos (`JWT_SECRET` y `JWT_PARTICIPANTE_SECRET`
respectivamente, cada uno con su propia estrategia Passport). Ambas env
vars son obligatorias — el backend no arranca sin `JWT_PARTICIPANTE_SECRET`
seteada (ver `docs/sprints/sprint4-auth-roles.md`).

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

## Equipos (Fase 4)

```text
POST   /api/salas/:salaId/equipos
GET    /api/salas/:salaId/equipos
GET    /api/salas/:salaId/equipos/:equipoId
PATCH  /api/salas/:salaId/equipos/:equipoId
DELETE /api/salas/:salaId/equipos/:equipoId
POST   /api/salas/:salaId/equipos/:equipoId/miembros
DELETE /api/salas/:salaId/equipos/:equipoId/miembros/:usuarioId
```

`Sala` suma dos campos configurables solo por el DOCENTE dueño o `ADMIN`
(vía el `PATCH /api/salas/:id` existente): `permiteCreacionEquipos`
(boolean, toggle) y `limiteIntegrantesEquipo` (entero opcional, `null` =
sin límite).

**Permisos:**
- **Crear equipo:** el DOCENTE dueño de la sala y `ADMIN` siempre pueden.
  Un `ESTUDIANTE` solo puede si `sala.permiteCreacionEquipos === true` y
  está inscrito en la sala (mismo chequeo por email que usa
  `SalasService.findAll` contra `SalaEstudiante`). Si el creador es
  `ESTUDIANTE`, queda agregado automáticamente como primer miembro.
- **Leer (listar/ver):** dueño de la sala, `ADMIN`, o cualquier estudiante
  inscrito en la sala (sin depender del toggle — leer no es crear).
- **Editar / eliminar / gestionar miembros:** el creador del equipo, el
  DOCENTE dueño de la sala, o `ADMIN`.
- **Salir del equipo:** cualquier miembro puede quitarse a sí mismo
  (`DELETE .../miembros/:usuarioId` con su propio id), sin necesidad de ser
  gestor.

`limiteIntegrantesEquipo` se valida al agregar un miembro nuevo (rechaza
con `409` si el equipo ya está lleno). Eliminar un equipo es **hard
delete** real (borra `EquipoMiembro` y luego el `Equipo`) — a diferencia
de `UxArtifact`/`Sala`/`Proyecto`, un equipo no es evidencia de
investigación y no necesita ventana de recuperación.

Los valores admitidos para `tipo` son `PERSONA`, `JOURNEY_MAP` y
`MOMENTOS_CRITICOS`. El campo `contenido` es JSON y permite que cada técnica
conserve su estructura específica. Las nuevas versiones se almacenan como
registros append-only asociados al mismo `artefactoLogicoId`.

**Permisos por rol:** `ESTUDIANTE` y `ADMIN` pueden crear/editar/bloquear/
eliminar artefactos. `DOCENTE` solo tiene acceso de lectura (`GET`) — no
puede modificar el trabajo de un estudiante aunque sea miembro o creador
del proyecto ("la visibilidad no implica permiso para modificar", ver
`docs/AUDIT_LOG.md` J1). Enforcement real es `@Roles(...)` por método en
`ArtifactsController`; el frontend además oculta los controles de edición
para DOCENTE (`shared/auth/permisos.ts`) para no mostrar algo que el
backend igual rechazaría con `403`.

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

## Comentarios

```text
POST   /api/projects/:proyectoId/comments
GET    /api/projects/:proyectoId/comments
PATCH  /api/projects/:proyectoId/comments/:comentarioId
DELETE /api/projects/:proyectoId/comments/:comentarioId
```

`proyectoId` es obligatorio; `artefactoLogicoId` es opcional y se puede
enviar al crear (body) o filtrar al listar (`?artefactoLogicoId=`). Se
guarda el `artefactoLogicoId` (no el `id` de una versión puntual del
`UxArtifact`) para que el comentario siga siendo válido aunque el
artefacto se versione.

**Permisos:** crear y listar requieren acceso al proyecto (dueño, `ADMIN` o
`ProyectoMiembro`, vía `ProjectAccessService.assertAccess`). Editar
(`PATCH`) y eliminar (`DELETE`) están restringidos al propio autor del
comentario o a `ADMIN`.

`DELETE` es soft delete (marca `deletedAt`); `findAll` excluye por defecto
los comentarios eliminados. No hay hilos/respuestas anidadas ni
notificaciones — comentario plano por proyecto/artefacto.

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
detalle de decisiones y `docs/sprints/sprint3-herramientas-ux.md §9` para el registro
de la sesión que lo implementó (incluye un bug real encontrado y corregido:
el filtro inicialmente ignoraba el array estructurado que ya armaba
`artifacts.service.ts`).
