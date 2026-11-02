# ADR-002 · Reservar temporalmente la edición de un artefacto

**Estado:** vigente al 2 de noviembre de 2026.

## Contexto

Dos integrantes pueden abrir el mismo artefacto. Si ambos editan durante varios minutos, descubrir el conflicto recién al guardar obliga a uno a repetir trabajo. Un bloqueo permanente, en cambio, dejaría al equipo sin acceso si alguien cierra el navegador.

## Decisión

La API guarda `lockedById` y `lockedUntil` sobre la versión más reciente de `UxArtifact`. La adquisición usa una actualización condicional de la base de datos. Puede adquirirla quien encuentre el bloqueo libre o vencido, y puede renovarla su titular. El plazo predeterminado es de cinco minutos, con un máximo de treinta por solicitud.

El editor de Personas y el de Momentos críticos solicitan la reserva, la renuevan mientras se edita e intentan liberarla al salir. Si otro integrante la tiene, la adquisición devuelve HTTP 409. Los permisos de escritura se comprueban independientemente del bloqueo.

## Consecuencias

El equipo puede leer mientras otra persona edita. Si el navegador pierde la conexión, la reserva caduca. Una pestaña antigua todavía puede intentar guardar, por eso se comprueba también la versión esperada cuando el cliente la envía. La nueva versión se crea sin bloqueo. Card Sorting y el acuerdo heurístico tienen sus propios flujos.

[Servicio de artefactos](../../apps/backend/src/modules/artifacts/artifacts.service.ts) · [Ciclo del bloqueo en la web](../../apps/frontend/src/shared/hooks/useArtifactEditLock.ts) · [Pruebas del servicio](../../apps/backend/src/modules/artifacts/test/artifacts.service.spec.ts).
