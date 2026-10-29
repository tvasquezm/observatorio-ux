# Sprint 11: Matriz de trazabilidad y ajustes finales

Semana del 26-10 al 30-10-2026. Reunión con el profesor guía y Entrega 2: 30-10-2026. Planificado: 21 SP (1 SP = 1 hora).

Hito verificable del cronograma: matriz de trazabilidad completa y ajustes de UI implementados.

## Actividades del backlog

| ID | Actividad | Responsable | SP | Estado | Evidencia en el repositorio |
| --- | --- | --- | --- | --- | --- |
| K1 | Análisis de resultados de la evaluación de usabilidad | Dreller, N. | 3 | Completado según el equipo | No: el informe de hallazgos no está en el repo |
| K2 | Ajustes de UI/UX según hallazgos (mínimo 3) | Gómez, B. | 5 | Completado según el equipo | Sí: ver "Ajustes de interfaz" |
| K3 | Matriz de trazabilidad (objetivo, requisito, módulo, evidencia, criterio) | Vásquez, T. | 4 | Completado según el equipo | No: la matriz no está en el repo |
| K4 | Borrador del Capítulo 4 (avance parcial) | Equipo | 3 | Completado según el equipo | No: el manuscrito no está en el repo |
| K5 | Documentación incremental Sprint 11 | Equipo | 2 | Completado (este documento) | Sí |
| R11 | Reunión semanal de avance con el profesor guía | Equipo | 1 | Pendiente: reunión del 30-10-2026 | - |
| BUF-S11 | Buffer / contingencia | - | 3 | Reserva | - |

Las horas reales no están registradas en el backlog; completar la columna antes de la entrega.

## Ajustes de interfaz

Cambios de UI registrados en `docs/CAMBIOS.md` y `CHANGELOG.md` durante la semana 23-10 al 27-10-2026. Cumplen el criterio de "al menos 3 ajustes implementados y verificados" en cantidad. Falta indicar a qué hallazgo de usabilidad responde cada uno; completar la columna "Hallazgo de origen".

| Ajuste | Fecha | Verificación | Hallazgo de origen |
| --- | --- | --- | --- |
| Formulario visible al abrirlo en las 5 técnicas | 23-10-2026 | `TechniqueLayout.test.tsx`, `tests/e2e/formulario-visible.spec.ts` | Por completar |
| Escala de respuesta seleccionable en Evaluación Heurística | 23-10-2026 | `ConfiguracionEditor.test.tsx` | Por completar |
| Acuerdo del equipo sobre la tabla, con Coinciden/Difieren y "Solo diferencias" | 23-10-2026 | `MatrizItem.test.tsx`, `flujo.test.tsx`, `tests/e2e/heuristica-sencilla.spec.ts` | Por completar |
| URL sin `http` con validación segura | 23-10-2026 | `url-segura.test.ts` | Por completar |
| Aviso de URL de fotografía no válida en Personas | 24-10-2026 | `PersonasPage.test.tsx` | Por completar |
| Limpieza de código y estilos sin uso de la vista anterior por rondas | 24-10-2026 | `catalogo.test.ts` | No aplica (mantenimiento) |
| Aviso "Editando: nombre" en Personas y Momentos críticos cuando otro miembro del equipo edita | 26-10-2026 | `artifacts.service.spec.ts`, `PersonasPage.test.tsx`, `MomentosCriticosPage.test.tsx` | Por completar |

### Edición de proyectos por el equipo

Esta versión mantiene la edición de un artefacto por una sola persona a la vez (bloqueo pesimista con `lockedById` y `lockedUntil`). Cuando otro miembro del equipo intenta editar, el servidor responde 409 con `Editando: <nombre>` y la pantalla muestra quién tiene la edición. El nombre solo lo ve quien tiene acceso al proyecto. No hay migración ni variables de entorno nuevas.

Fuera de alcance, para futuras versiones: edición simultánea por varias personas, pedir turno ("Avisarme cuando esté libre") y aviso a quien edita de que alguien espera.

## Matriz de trazabilidad

La matriz no está en el repositorio. Columnas acordadas en el backlog:

| Objetivo | Requisito | Módulo | Evidencia | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| Por completar | Por completar | Por completar | Por completar | Por completar |

Cuando exista, guardarla en `docs/` con un nombre que no use la palabra "Sprint" y agregarla al índice del `README.md`.

## Pendientes y verificación

- [ ] Reunión del 30-10-2026 con el profesor guía y Entrega 2: registrar el acta (R11).
- [ ] Completar en la tabla de ajustes la columna "Hallazgo de origen".
- [ ] Guardar el informe de hallazgos (K1) y la matriz de trazabilidad (K3) donde el profesor pueda revisarlos.
- [ ] Actualizar en el backlog K1 a K5 a Completado y registrar horas reales.
- [ ] Registrar en `docs/ARCHITECTURE.md` el avance de este sprint (hito de K5).
- [ ] Correr `pnpm build:shared`, `pnpm --filter backend test`, `pnpm --filter frontend test` y `pnpm --filter frontend build`, y anotar aquí el total de pruebas en verde. Sprint 9 cerró con 781 pruebas (449 Frontend, 326 Backend, 6 E2E).