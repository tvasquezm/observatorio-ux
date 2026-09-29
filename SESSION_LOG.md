# SESSION LOG — 2026-09-12

## Hecho
- Fase 3 (Comentarios): modelo `Comentario` + migración + módulo backend completo (service/controller/dto/module) + registro en `AppModule`.
- Tests unitarios `comments.service.spec.ts` (create/findAll/update/softDelete, permisos autor/ADMIN).
- Verificado en máquina del usuario: `prisma generate` + `nest build` OK, `prisma migrate deploy` aplicado contra Postgres real (Docker).

## Archivos modificados
- `apps/backend/prisma/schema.prisma` — modelo `Comentario` + relaciones inversas en `Proyecto` y `Usuario`.
- `apps/backend/prisma/migrations/20260912200000_add_comentario/migration.sql` — nueva.
- `apps/backend/src/modules/comments/comments.dto.ts` — nuevo.
- `apps/backend/src/modules/comments/comments.service.ts` — nuevo.
- `apps/backend/src/modules/comments/comments.controller.ts` — nuevo.
- `apps/backend/src/modules/comments/comments.module.ts` — nuevo.
- `apps/backend/src/app.module.ts` — registra `CommentsModule`.
- `docs/BACKEND.md`, `docs/ARCHITECTURE.md`, `docs/PLAN_AJUSTES.md` — documentación de la fase.

## Decisiones tomadas
- `artefactoLogicoId` (no `id` de versión) para que el comentario sobreviva al versionado del artefacto (mismo criterio que ya usa `UxArtifact` internamente).
- Solo `Usuario` comenta, no `Participante` — no estaba en el contexto original.
- Editar/eliminar restringido a autor o `ADMIN` (chequeo propio en `CommentsService`, no en `ProjectAccessService`).
- Sin frontend en esta fase — no estaba pedido.

## Pendiente
- Correr `pnpm --filter backend test comments` en un entorno con Prisma Client generado (no se pudo en el sandbox, mismo bloqueo de red de `binaries.prisma.sh`).
- Frontend de comentarios (si se quiere) queda como fase aparte, no definida.

## Siguiente paso sugerido
- Correr `pnpm --filter backend prisma generate` + `pnpm --filter backend build` (o `docker compose up --build`) en un entorno real para confirmar que compila y migra sin errores.
- Definir si se avanza a Fase 4 (Equipos) o se hace frontend de Comentarios primero.

---

# SESSION LOG — 2026-09-12 (continuación, Fase 4)

## Hecho
- Fase 4 (Equipos): modelos `Equipo`/`EquipoMiembro` + campos `permiteCreacionEquipos`/`limiteIntegrantesEquipo` en `Sala` + migración + módulo backend completo (service/controller/dto/module) + registro en `AppModule`.
- Extendido `UpdateSalaDto` y `SalasService.update()` para los dos campos nuevos (sin endpoint aparte).
- Tests unitarios `equipos.service.spec.ts` (creación por rol/toggle, pertenencia a sala, límite de integrantes, gestión vs. autogestión, hard delete).

## Archivos modificados
- `apps/backend/prisma/schema.prisma` — `Equipo`, `EquipoMiembro`, campos nuevos en `Sala`, relaciones inversas en `Usuario`.
- `apps/backend/prisma/migrations/20260912210000_add_equipos/migration.sql` — nueva.
- `apps/backend/src/modules/equipos/*` — nuevo módulo completo.
- `apps/backend/src/modules/salas/dto/sala.dto.ts` — `UpdateSalaDto` extendido.
- `apps/backend/src/modules/salas/salas.service.ts` — `update()` extendido.
- `apps/backend/src/app.module.ts` — registra `EquiposModule`.
- `docs/BACKEND.md`, `docs/ARCHITECTURE.md`, `docs/PLAN_AJUSTES.md` — documentación de la fase.

## Decisiones tomadas
- Equipo vive en Sala, no en Proyecto — el plan original no lo vincula a proyectos.
- Toggle/límite reutilizan el PATCH de Sala existente, no un endpoint nuevo.
- Gestión de equipo (editar/eliminar/miembros) es lógica propia del módulo, no delegada a un `ProjectAccessService`-like compartido.
- Salir del equipo (self-removal) no requiere ser gestor.
- Hard delete real para Equipo — no es evidencia de investigación como el resto de entidades del sistema.

## Pendiente
- No se pudo correr `prisma generate`/build/test en el sandbox (mismo bloqueo de red que Fase 3, `binaries.prisma.sh`). Verificar en un entorno real:
  ```bash
  pnpm install
  pnpm --filter shared-types build
  pnpm --filter backend run prisma:generate
  pnpm --filter backend run prisma:deploy
  pnpm --filter backend build
  pnpm --filter backend test equipos
  ```
- Frontend de Equipos (si se quiere) queda como fase aparte, no definida.

## Siguiente paso sugerido
- Correr los comandos de arriba y confirmar 0 errores + tests en verde (mismo flujo que se hizo para Fase 3).
- Definir si se avanza a Fase 5 (Permisos de Proyecto) o se hace frontend de Equipos/Comentarios primero.

# SESSION LOG — 2026-09-12 (Fase 5)

## Hecho
- Migración: `Sala.permiteCreacionProyectos` (toggle, default false).
- `CreateProjectDto.salaId` (opcional).
- `ProjectsService.create()`: ESTUDIANTE requiere `salaId` + toggle activo + inscripción en la sala (403/404 si falta algo). DOCENTE/ADMIN sin cambio.
- `ProjectsService.update()`: DOCENTE no puede editar proyecto creado por ESTUDIANTE (403), salvo ADMIN.
- `UpdateSalaDto`/`SalasService.update()`: suman `permiteCreacionProyectos` al PATCH existente.
- `AuthService.login()`: ESTUDIANTE rechazado (403) si no tiene ninguna Sala activa (`deletedAt: null`, `fechaFin` null o no vencida). Se revalida en cada login.
- Docs actualizados: `docs/BACKEND.md` (nueva sección Fase 5), `docs/ARCHITECTURE.md` (nueva sección Fase 5), `docs/PLAN_AJUSTES.md` (marcado como hecho + bitácora).

## Archivos modificados
- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/20260912220000_add_permite_creacion_proyectos/migration.sql`
- `apps/backend/src/modules/projects/projects.dto.ts`
- `apps/backend/src/modules/projects/projects.service.ts`
- `apps/backend/src/modules/salas/dto/sala.dto.ts`
- `apps/backend/src/modules/salas/salas.service.ts`
- `apps/backend/src/modules/auth/auth.service.ts`
- `docs/BACKEND.md`, `docs/ARCHITECTURE.md`, `docs/PLAN_AJUSTES.md`

## Decisiones tomadas
- Alcance de "sala lo permite" definido con el usuario en el chat: mismo patrón toggle que Fase 4 (Equipos), no un mecanismo nuevo.
- "La materia lo requiere" (texto original del plan): descartado, no existe entidad Materia.
- "Sala activa" para login: `deletedAt: null` + (`fechaFin` null o `>= ahora`); sin `fechaFin` = siempre activa (asumido, confirmar si no es correcto).

## Pendiente
- No se pudo correr `prisma generate`/build/tests en el sandbox: sin `pnpm` disponible y `npm` no resuelve `workspace:*`. Revisado manualmente contra el patrón de Equipos (Fase 4). Verificar en entorno real:
  ```bash
  pnpm install
  pnpm --filter shared-types build
  pnpm --filter backend run prisma:generate
  pnpm --filter backend run prisma:deploy
  pnpm --filter backend build
  pnpm --filter backend test projects auth
  ```
- Sin frontend en esta fase (no pedido).

## Siguiente paso sugerido
- Correr los comandos de arriba y confirmar 0 errores + tests en verde.
- Definir si se avanza a Fase 6 (Dashboard sala del estudiante) o Fase 7 (Módulo Admin).
