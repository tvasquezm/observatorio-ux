# Dudas para el profesor

Preguntas y pendientes que dependen de información que el equipo no tiene
(no se fabrica evidencia ni se asume una respuesta) — se consultan y se
cierran acá cuando haya respuesta.

## Abiertas

1. **Gestión de participantes: ¿reservada a ADMIN/creador, o también a
   miembros del proyecto?**
   `ProjectDetailLayout.tsx` (`canManageParticipants`) solo habilita la
   pestaña "Participantes" para `ADMIN` o el usuario `creadoPorId` del
   proyecto. Un `ProyectoMiembro` no-creador (modelo agregado en F5, ver
   `docs/AUDIT_LOG.md`) no ve esa pestaña aunque sí tiene acceso al resto
   del proyecto (personas, journey map, etc.). No hay evidencia de si esto
   es una decisión de negocio explícita o quedó así por default al agregar
   `ProyectoMiembro`. — `apps/frontend/src/layouts/ProjectDetailLayout.tsx`

2. **D7 — referencias del capítulo 2 del Trabajo de Título.**
   Pendiente desde `docs/ARCHITECTURE.md` (verificación de Sprint 4): no se
   encontró el capítulo 2 entre los archivos disponibles, así que no se
   pudieron completar/verificar sus referencias sin fabricarlas.

3. **R4 — acta de reunión con el profesor.**
   Pendiente desde `docs/ARCHITECTURE.md` (verificación de Sprint 4): no
   existe un acta fuente disponible en el repositorio para dar por cerrado
   este entregable.

## Cerradas

_(vacío por ahora)_
