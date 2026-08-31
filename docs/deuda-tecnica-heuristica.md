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

## Sigue abierto (sin evidencia de resolución en ARCHITECTURE.md/BACKEND.md)

5. **Tipado débil en capa de autenticación.** Controller y service podrían
   seguir usando `usuario: any` en vez de `AuthenticatedUser`. No
   confirmado ni desmentido por los documentos actuales — verificar en
   código.

6. **`/auth/test-token` no distingue tipo de usuario.** `ARCHITECTURE.md`
   A4 solo aborda que el endpoint se gatea por `NODE_ENV` en producción —
   no aborda el payload hardcodeado a Usuario evaluador. Sigue pendiente
   parametrizar por query param o crear variantes separadas.

7. **Restos de debugging en código productivo**
   (`console.log('Objeto usuario detectado:', usuario)` en
   `EvaluacionHeuristicaController.crear`). Sin mención en auditorías
   posteriores — verificar y remover si sigue ahí.
