# Deuda técnica — Módulo Evaluación Heurística

Detectada durante auditoría de integración (Postman), 03/08/2026.
Estado actualizado cruzando con `ARCHITECTURE.md` (Sprint 1) y
`BACKEND.md` — ver fuente citada en cada ítem.

## Resueltos

1. ~~Falta autorización por propiedad de sesión~~ — **Resuelto.**
   `BACKEND.md` §Evaluación heurística confirma: "Solo el evaluador dueño
   del proyecto puede modificar o finalizar sus sesiones, salvo un
   usuario con rol ADMIN."

2. ~~No existe RolesGuard~~ — **Resuelto.** `ARCHITECTURE.md` Sprint 1:
   "Se implementó `RolesGuard` como guard reutilizable para todos los
   módulos futuros."

3. ~~Secreto JWT hardcodeado~~ — **Resuelto.** `ARCHITECTURE.md` Sprint 1:
   "El secreto JWT se movió a `ConfigService` (`.env`), eliminando el
   hardcodeo previo."

4. ~~Falta validación de formato UUID en parámetros de ruta~~ —
   **Resuelto.** `ARCHITECTURE.md` Sprint 1: "Se estandarizó
   `ParseUUIDPipe` en los parámetros de ruta de todos los módulos."

## Resueltos (verificado sobre código real, sesión actual)

5. ~~Tipado débil en capa de autenticación~~ — **Resuelto.**
   `evaluacion-heuristica.controller.ts` usa `@CurrentUser() user:
   AuthenticatedUser` (interfaz tipada en
   `auth/types/authenticated-user.interface.ts`) en sus 4 endpoints. Cero
   `usuario: any` en el módulo.

7. ~~Restos de debugging en código productivo~~ — **Resuelto.** Cero
   `console.log` en `apps/backend/src/modules/sessions/evaluacion-heuristica`.

## Sigue abierto (verificado, matiz sobre el hallazgo original)

6. **`/auth/test-token` no distingue tipo de usuario.** Matiz: no es un
   único endpoint con payload hardcodeado — son dos endpoints separados
   (`GET /auth/test-token` → `issueDevelopmentEvaluatorToken()`,
   `GET /auth/test-participant-token` →
   `issueDevelopmentParticipantToken()`). El riesgo original (un solo
   endpoint sin distinguir tipo) ya no existe tal cual; sigue pendiente
   evaluar si conviene consolidar en uno parametrizado o dejar así.