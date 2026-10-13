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

2. **R4 — acta de reunión con el profesor.**
   Pendiente desde `docs/ARCHITECTURE.md` (verificación de Sprint 4): no
   existe un acta fuente disponible en el repositorio para dar por cerrado
   este entregable.

3. **E6/R5 — envío de la pauta y reunión de Sprint 5.**
   La pauta está preparada en
   `docs/sprints/sprint5-pauta-evaluacion-usabilidad.md`, pero no hay evidencia
   de envío, revisión ni reunión. Registrar esos hechos solo cuando ocurran.

4. **R6 — reunión y validación del despliegue de Sprint 6.**
   F1–F8 están implementados y documentados en
   `docs/sprints/sprint6-despliegue.md`, pero no existe un acta ni una aprobación
   verificable del profesor. Registrar fecha, asistentes, observaciones y
   acuerdos antes de marcar R6 como completo.

## Cerradas

1. **D7 — referencias complementarias del capítulo 2.**
   Investigación terminada con tres fuentes y texto puente en
   `docs/sprints/sprint4-referencias-marco-teorico.md`. Sigue faltando el
   manuscrito fuente para incorporar el contenido directamente.
