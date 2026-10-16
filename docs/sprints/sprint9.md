# Sprint 9: Bitácora de incidencias cerrada

Se realizó la revisión, resolución y formalización de la bitácora de incidencias técnicas detectadas durante las fases de auditoría, pruebas de integración y evaluación con el profesor guía.

## Registro y Remediación de Incidencias Clave

Todas las correcciones aplicadas han sido respaldadas con pruebas unitarias y de integración para evitar regresiones.

| Código / Módulo | Incidencia Detectada | Causa Raíz | Solución Aplicada | Verificación |
| --- | --- | --- | --- | --- |
| **AUTH-01** / Card Sorting | Confusión de identidad entre Evaluador y Participante. | `fetch` del participante enviaba por omisión las cookies de sesión del evaluador (`evaluadorToken`) al mismo origen. | Se configuró `credentials: 'omit'` en el cliente HTTP del participante. | Test unitario y recorrido E2E con ambas identidades[cite: 1]. |
| **ARTIFACT-02** / Bloqueo UX | Sobrescritura involuntaria de artefactos editados simultáneamente. | El formulario habilitaba el envío antes de adquirir la confirmación del bloqueo pesimista. | Se bloqueó el botón de guardado hasta confirmar el *lock* y validar la versión (`expectedVersion`). | Pruebas de espera y respuesta HTTP 409[cite: 1]. |
| **SALA-03** / Permisos | Estudiantes sin sala activa podían acceder al sistema. | No se revalidaba el estado/vigencia de la sala del estudiante durante el proceso de autenticación. | Inclusión de filtro `deletedAt: null` y comprobación de `fechaFin` activa en `AuthService.login()`. | Test unitario en `auth.service.spec.ts`[cite: 1]. |
| **HEUR-04** / Evaluación | Pérdida de borrador al adjuntar evidencia o cancelar descartes. | Falta de retención de estado ante excepciones de red o cierres accidentales. | Se implementaron hooks de resguardo local (`useUnsavedChanges`, `useArtifactEditLock`) y confirmación previa. | Tests UI en `EvaluacionHeuristicaPage.test.tsx`[cite: 1]. |

## Artefactos de Trazabilidad Actualizados

1. **`docs/AUDIT_LOG.md`:** Documenta el historial técnico de bugs reales encontrados, su impacto en la arquitectura y la solución aplicada[cite: 1].
2. **`CHANGELOG.md`:** Registro cronológico de cambios de versión, nuevas capacidades y parches aplicados[cite: 1].
3. **`SESSION_LOG.md`:** Bitácora de trabajo detallada por sesión de desarrollo[cite: 1].

## Estado Final del Sprint

- **Pruebas del Monorepo:** 781 pruebas automatizadas pasando exitosamente (449 Frontend + 326 Backend + 6 E2E)[cite: 1].
- **Bitácora de Incidencias:** Sin fallos críticos o bloqueantes pendientes.
- **Estado en Cronograma:** Cierre formalizado y verificado[cite: 1].