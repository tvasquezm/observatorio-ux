# ADR-003 · Conservar una fila por versión de un artefacto UX

**Estado:** vigente al 2 de noviembre de 2026.

## Contexto

Los perfiles de Persona, Journey Maps y Momentos críticos constituyen evidencia del proyecto. El equipo necesita saber quién guardó cada revisión y cuándo. Sobrescribir el contenido impediría reconstruir ese historial.

## Decisión

La creación genera la versión 1 de `UxArtifact`. Cada guardado posterior mediante `POST /api/projects/:proyectoId/artifacts/:artefactoId/versions` inserta el contenido completo en otra fila. La nueva fila recibe su propio identificador, conserva `artefactoLogicoId` y registra la siguiente versión, el autor y la fecha.

El servicio consulta la última versión, incluso cuando recibe el identificador de una anterior. Si el cliente envía `expectedVersion` y ya cambió, devuelve HTTP 409. La restricción única sobre `(artefactoLogicoId, version)` impide aceptar dos filas con el mismo número ante guardados concurrentes. El borrado lógico marca todas las versiones mediante `deletedAt`.

## Consecuencias

El historial conserva los contenidos anteriores y permite atribuir cada cambio. La base crece con el número y tamaño de las revisiones. Las vistas de estado actual deben agrupar por identidad lógica y tomar la versión vigente. El contenido es append-only, aunque el bloqueo y las marcas de eliminación sí se actualizan.

[Esquema de datos](../../apps/backend/prisma/schema.prisma) · [Rutas de artefactos](../../apps/backend/src/modules/artifacts/artifacts.controller.ts) · [Creación de versiones y conflictos](../../apps/backend/src/modules/artifacts/artifacts.service.ts).
