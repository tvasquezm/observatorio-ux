# Flujo de heurística Implementation Plan

> Implementación en esta sesión con superpowers:subagent-driven-development y comprobación de integración al finalizar.

**Goal:** implementar los flujos de las 19 diapositivas, conservando datos existentes y entregar un PR revisable.

**Architecture:** tablas nuevas para evaluaciones, metodologías propias y evidencias. Contrato compartido `packages/shared-types/src/domains/heuristica-flujo.ts`; nueva API bajo `/projects/:proyectoId/evaluacion-heuristica/evaluaciones`.

**Tech Stack:** React, TanStack Query, NestJS, Prisma 7, PostgreSQL, pdfmake, SVG/canvas nativos.

**Spec:** `docs/superpowers/specs/2026-10-09-flujo-heuristica.md`.

## Global Constraints

- No nuevas dependencias, seed destructivo, cambios de autenticación ni borrado/reinterpretación de sesiones antiguas.
- API autoriza proyecto y rol del flujo; cada escritura valida payload completo y revision.
- Ninguna respuesta individual ajena ni captura puede revelarse antes de la revisión compartida.
- Informe final basado solo en consenso aprobado, inmutable; comparación manual y compatible.
- Rama `flujo-de-heuristica`, PR antes de integración/activación, sin merge automático.

## Review Focus

- Experto, lector o coordinador intentando leer respuestas/capturas de otro en fase individual.
- Guardado concurrente, navegación o caída de red: conservar borrador y evitar sobrescrituras.
- Uno/cinco expertos, todo no aplica, pendientes y desacuerdo impiden cierre incorrecto.
- Cambio de consenso revoca aprobaciones; un lector no modifica informe ni metodología original.
- Comparación con distinto alcance/escala o problema ausente no certifica solución.

### Task 1: contratos, catálogo y métricas

Files: `packages/shared-types/src/domains/heuristica-flujo.ts`, `heuristica-metodologias.ts`, exports; tests puros frontend.
- [ ] Verificar fuentes primarias de los seis conjuntos iniciales y cuatro complementos.
- [ ] Implementar catálogo versionado, copia/combinación preservando origen, métricas compatibles y diferencias/comparación puras.
- [ ] Probar independencia de copias, no aplica/pendientes, ponderación explícita, ordinal sin media y alcance incompatible.

### Task 2: persistencia y API

Files: Prisma schema + migración aditiva, nueva carpeta backend `heuristica-flujo`, SessionsModule, pruebas de servicio.
- [ ] Crear pruebas negativas de permisos, transiciones, validación y concurrencia antes del servicio.
- [ ] Implementar rutas del contrato y almacenamiento JSON validado bajo bloqueo de fila y revision.
- [ ] Probar consenso explícito completo, aprobaciones revocadas, informe y revisiones, capturas aisladas y comparación justificada.
- [ ] Generar Prisma y compilar/testear usando base aislada.

### Task 3: pantalla del recorrido

Files: nueva carpeta frontend `features/heuristica-flujo`, página de entrada existente y tests.
- [ ] Implementar listado, configuración y biblioteca/editor, escalas, equipo, evaluación individual con guardado y entrega.
- [ ] Implementar discrepancias, consenso manual y aprobación/consolidación/cierre, historial y comparación.
- [ ] Probar cargas/errores, guardado fallido, no aplica justificado, cierre bloqueado y conservar acceso a sesiones anteriores.

### Task 4: evidencias, PDF e integración

Files: componentes nuevos de evidencia/anotación, exportador PDF y tests; docs funcionales.
- [ ] Implementar editor SVG con formulario equivalente para teclado, deshacer/editar y original persistente.
- [ ] Exportar informe versionado con contexto, métricas y capturas anotadas; probar que usa solo consolidado.
- [ ] Ejecutar pruebas/builds y prueba de integración real con uno/cinco usuarios en base aislada.
- [ ] Revisar requisitos PPT y seguridad, corregir hallazgos, actualizar descripción y publicar PR para revisión sin integrar.
