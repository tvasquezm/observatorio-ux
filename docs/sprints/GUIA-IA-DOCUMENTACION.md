# 🤖 Guía de Documentación para Asistentes de IA (Claude / ChatGPT)

> **Contexto para la IA:** si estás leyendo este documento, estás asistiendo al equipo de desarrollo del **Observatorio UX (UTEM)**. Define las reglas de cómo registrar cambios, nombrar archivos y mantener la documentación del proyecto.

## 1. 🚫 Regla de oro: la palabra "Sprint"

**Nunca inventes números de Sprint.** "Sprint" queda reservado a los 13 sprints oficiales del cronograma del Trabajo de Título.

- Incorrecto: "Sprint 10 de desarrollo", "Sprint 4 de nuestra sesión" (nombres inventados por una sesión de IA, no por el cronograma real).
- Correcto: "Sesión de trabajo", "Ronda de correcciones". Si mencionás un Sprint, que corresponda al avance real del equipo (ej. Sprint 3 = Herramientas UX, Sprint 4 = Frontend Transversal Integrado).

## 2. 📁 Estructura de archivos y nomenclatura

Los registros de sesión de trabajo van en `docs/sprints/`.

- Formato: `sprint[X]-[tema-principal].md`
- Ejemplos válidos: `sprint3-herramientas-ux.md`, `sprint4-auth-roles.md`
- Prohibido: nombres genéricos o en mayúsculas tipo `SESION-CLAUDE.md`, `chat-log.md`, `ACTUALIZACION.md`

## 3. 📝 Los 4 documentos maestros (qué actualizar y cuándo)

1. **`docs/ARCHITECTURE.md`** — solo si se toma una decisión de diseño clave (cambiar cómo funciona el Soft Delete, un modelo de BD nuevo, un patrón de arquitectura). Explica el *por qué*.
2. **`docs/AUDIT_LOG.md`** — solo si se detectó y reparó un bug crítico o vulnerabilidad en código ya existente (bypass de seguridad, falla en el bloqueo pesimista).
3. **`docs/CAMBIOS.md`** — changelog granular, archivo por archivo modificado.
4. **`README.md`** — si se crea un doc nuevo, hay que agregarlo al índice.

## 4. 🧠 Vocabulario técnico obligatorio

Verificado contra `apps/backend/prisma/schema.prisma` al momento de escribir esta guía:

- **`UxArtifact`** — el modelo polimórfico único (`model UxArtifact` en `schema.prisma`). No usar "tabla Persona" o "tabla Journey"; todos los lienzos son un `UxArtifact`.
- **Bloqueo Pesimista (Lock)** — mecanismo de `lockedById` + `lockedUntil` (TTL) en `UxArtifact`, para evitar sobreescritura colaborativa.
- **Soft Delete** — borrado lógico vía `deletedAt` en `UxArtifact`. Nunca un `DELETE` físico — protege la cadena de evidencia.
- **Evaluador vs. Participante** — Evaluador (Estudiante/Docente) usa `evaluadorToken` en cookie `httpOnly`. Participante (encuestado externo) usa `participanteToken` en `localStorage`. Nunca mezclar su lógica de estado ni de autenticación (ver `JWT_PARTICIPANTE_SECRET`, secreto de firma propio y separado de `evaluadorToken`).
