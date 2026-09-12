# PLAN — Ajustes Observatorio UX

Estado general: EN CURSO — Fase 1 y 2 arrancando.

---

## Contexto (audit previo)

Stack: NestJS + Prisma + PostgreSQL (backend) / React + Vite (frontend), monorepo pnpm.

Ya implementado:
- Sala (profesor, período, fechas) + SalaEstudiante (inscripción sin cuenta).
- Proyecto.salaId opcional, vincular/desvincular.
- Soft delete en UxArtifact.
- Roles ESTUDIANTE/DOCENTE/ADMIN + RolesGuard.
- ProyectoMiembro (add/remove).

No existe (falta 100%):
- Comentarios (modelo Comentario).
- Equipos (entidad Equipo/EquipoMiembro + toggle en Sala).
- Hard delete (de cualquier entidad).
- Restricción real a creación de proyecto por ESTUDIANTE.
- Bloqueo de edición de DOCENTE sobre proyecto de ESTUDIANTE.
- Dashboard: sala del estudiante.
- Módulo Admin (gestión de profesores).

---

## FASE 1 — Participantes: acceso sin datos personales

**Objetivo:** eliminar el requisito de nombre/correo para participantes. Reemplazar por un punto de acceso público que permite enviar la respuesta (ej. Card Sorting) directamente.

**Estado actual (a modificar):**
- `modules/auth/auth.service.ts` → `registerParticipant()`: hoy exige email en whitelist (`ParticipanteWhitelist`) + código de invitación, crea `Participante` con `metadata.nombre`.
- `modules/auth/auth.controller.ts` → `POST /auth/participants/register`, `/consent`, `/token`.

**Cambios:**
- Nuevo flujo: `POST /auth/participants/access` (o similar) → recibe solo `proyectoId`, crea `Participante` sin metadata personal, devuelve token de sesión directo (reusar `ParticipanteJwtService`).
- Evaluar si se mantiene whitelist/código de invitación como control de acceso al proyecto (sin datos personales) o si se abre totalmente vía link/QR público — DEFINIR antes de codear (afecta seguridad: cualquiera con el link entra).
- Mantener consentimiento (`Consentimiento`) — no se elimina, es requisito legal/ético, no dato de contacto.
- Ajustar frontend `features/onboarding` (landing de sesión) para no pedir form Nombre/Correo.

**Archivos:**
- `apps/backend/src/modules/auth/auth.service.ts`
- `apps/backend/src/modules/auth/auth.controller.ts`
- `apps/backend/src/modules/auth/auth.dto.ts`
- `apps/frontend/src/features/onboarding/*`
- Posible migración: revisar si `ParticipanteWhitelist` se mantiene o se simplifica.

**Riesgo:** medio — toca autenticación y control de acceso a sesiones.

**Pendiente de definir:** ¿se mantiene whitelist (control de quién entra) sin pedir datos, o el acceso es 100% abierto por link/QR?

---

## FASE 2 — Sala: soft delete (20 días) + hard delete ADMIN con confirmación

**Objetivo:** borrar una Sala no debe dejar Proyectos huérfanos ni inaccesibles.

**Cambios:**
- `Sala`: agregar `deletedAt DateTime?` (migración nueva).
- Al soft-delete de Sala → cascada lógica: todos los `Proyecto` con ese `salaId` también se marcan como eliminados (agregar `deletedAt` a `Proyecto` si no existe, o campo equivalente).
- Ventana de recuperación: **20 días**. Job o chequeo en el propio endpoint de restore que valide `deletedAt + 20d > now()`.
- Endpoint restore: `POST /salas/:id/restore` (DOCENTE dueño o ADMIN) — revierte `deletedAt` de la sala y de sus proyectos.
- Hard delete definitivo: `DELETE /salas/:id/hard`, solo `@Roles('ADMIN')`, requiere confirmación explícita en el body (`{ confirm: "DELETE" }`) — si no coincide exactamente, rechazar. Borra en cascada real: Sala → Proyectos → ResearchSession/UxArtifact/ParticipanteWhitelist asociados.
- Filtrar `deletedAt: null` en los `findMany`/`findAll` existentes de Sala y Proyecto (findAll, listProyectos, etc.) para que lo soft-deleted no aparezca.

**Archivos:**
- `apps/backend/prisma/schema.prisma` (deletedAt en Sala y Proyecto)
- Nueva migración Prisma
- `apps/backend/src/modules/salas/salas.service.ts`
- `apps/backend/src/modules/salas/salas.controller.ts`
- `apps/backend/src/modules/salas/dto/sala.dto.ts` (dto de confirmación hard delete)
- `apps/backend/src/modules/projects/projects.service.ts` (filtrar deletedAt en findAll)

**Riesgo:** alto — borrado en cascada, irreversible pasado el hard delete.

**Pendiente de definir:** nada — 20 días confirmado, cascada confirmada.

---

## FASE 3 — Comentarios (pendiente, no iniciada)

Modelo `Comentario`: `proyectoId` obligatorio, `artefactoId` opcional. Permisos vía `ProjectAccessService`. Ver detalle en resumen de mejoras (mensaje previo del chat).

## FASE 4 — Equipos (pendiente, no iniciada)

Entidad `Equipo`/`EquipoMiembro` + `Sala.permiteCreacionEquipos` (toggle DOCENTE) + límite de integrantes configurable solo por DOCENTE. Pueden crear equipo: DOCENTE y ESTUDIANTE (si el toggle lo permite).

## FASE 5 — Permisos de Proyecto (pendiente, no iniciada)

- Restringir `ProjectsService.create()`: ESTUDIANTE solo crea proyecto si sala lo permite o la materia lo requiere.
- Bloquear `PATCH /projects/:id` cuando `user.rol === 'DOCENTE'` y el proyecto fue creado por un ESTUDIANTE (salvo ADMIN).

## FASE 6 — Dashboard: sala del estudiante (pendiente, no iniciada)

Frontend `DashboardPage.tsx`: mostrar sala(s) a las que pertenece el estudiante (reusar `GET /salas`, ya filtra por email).

## FASE 7 — Módulo Admin (pendiente, no iniciada)

Backend `UsersModule` (`@Roles('ADMIN')`) para crear/listar/**eliminar** DOCENTE, ver estudiantes. Frontend `/admin/profesores`.

- Endpoint eliminar profesor: `DELETE /users/:id` (ADMIN). Definir qué pasa con sus Salas al eliminarlo (¿se reasignan, quedan huérfanas, se bloquea el borrado si tiene salas activas?) — DEFINIR antes de codear.

---

## Nota de alcance frontend

Todas las fases con frontend (Fase 1 onboarding, Fase 6 Dashboard, Fase 7 Admin) se desarrollan como **estructura básica funcional** (componentes, rutas, llamadas a API, estado) sin trabajo de estilos/UI final — un compañero del equipo se encarga del diseño visual completo después. No invertir tiempo en CSS/theming más allá de lo mínimo para que sea usable.

## Reglas de ejecución (recordatorio)

- Migraciones nuevas, nunca editar las existentes.
- Cada fase se implementa solo tras aprobación explícita.
- Actualizar `docs/BACKEND.md` / `docs/ARCHITECTURE.md` si la fase cambia comportamiento público/API.
- Checkpoint en `SESSION_LOG.md` al cerrar cada fase.

## Bitácora

- [Fecha de hoy] — Plan creado. Arrancando Fase 1 y Fase 2 en paralelo (aprobadas por el usuario).
