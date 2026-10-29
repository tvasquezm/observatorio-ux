# Sprint 10: Evaluación de usabilidad aplicada

Semana del 19-10 al 23-10-2026. Reunión con el profesor guía: 23-10-2026. Planificado: 18 SP (1 SP = 1 hora).

Hito verificable del cronograma: sesiones de usabilidad realizadas con usuarios representativos y hallazgos sistematizados.

## Actividades del backlog

| ID | Actividad | Responsable | SP | Estado |
| --- | --- | --- | --- | --- |
| J1 | Pauta de evaluación de usabilidad, versión final | Dreller, N. | 2 | Completado |
| J2 | Reclutamiento de usuarios representativos | Gómez, B. | 2 | Completado |
| J3 | Sesiones de evaluación moderadas | Equipo | 6 | Completado |
| J4 | Registro y sistematización de hallazgos | Vásquez, T. | 3 | Completado (el backlog aún dice En progreso) |
| J5 | Documentación incremental Sprint 10 | Equipo | 2 | Completado (este documento; el backlog aún dice En progreso) |
| R10 | Reunión semanal de avance con el profesor guía | Equipo | 1 | Completado |
| BUF-S10 | Buffer / contingencia | - | 2 | Reserva |

Las horas reales no están registradas en el backlog; completar la columna "Horas reales" antes de la entrega.

## Base de la evaluación

- **Pauta:** `docs/sprints/sprint5-pauta-evaluacion-usabilidad.md` (tareas T1 a T10, registro por tarea, SEQ por tarea y SUS al final, criterios de aceptación del piloto).
- **Retroalimentación previa de los profesores:** `docs/retroalimentacion-profesores.md` (pendientes E-09 a E-13, T-01 a T-04 y guion de la sesión de evaluación navegable).
- **Criterios de aceptación del piloto:** al menos 80 % de las tareas críticas (T1, T5, T6, T8, T9) sin ayuda del moderador; ningún participante bloqueado en Card Sorting por enlace; `/admin` inaccesible para roles no ADMIN; controles esenciales operables con teclado.

## Resultados de las sesiones

Los resultados de las sesiones no están en el repositorio. Para cerrar este documento, completar la tabla con la matriz anonimizada de resultados (sin nombres ni datos personales):

| Dato | Valor |
| --- | --- |
| Fechas de las sesiones | Por completar |
| Participantes (estudiantes / docentes) | Por completar |
| Dispositivos usados (escritorio / móvil) | Por completar |
| Tareas con éxito sin ayuda (T1, T5, T6, T8, T9) | Por completar |
| SEQ promedio por tarea | Por completar |
| Puntaje SUS (0 a 100) | Por completar |
| Hallazgos por severidad (crítico / alto / medio / bajo) | Por completar |
| Consentimiento registrado | Por completar |

## Cambios de interfaz registrados en el periodo

Cambios con fecha del 23-10-2026 en `docs/CAMBIOS.md` (Fases 1, 2 y 4):

- **Formulario visible:** al abrir un formulario en las 5 técnicas, la página baja hasta él y deja el foco en su título. Respeta `prefers-reduced-motion`.
- **Escala de respuesta en Evaluación Heurística:** selector con Cumple/Parcial/No cumple, Sí/No, 1 a 5 o severidad 0 a 4 de Nielsen, con vista previa de los niveles.
- **URL sin `http`:** los campos de dirección web aceptan `miweb.cl` y guardan `https://miweb.cl`; el servidor valida y rechaza esquemas peligrosos (`javascript:`, `data:`, `file:`, `ftp:`).
- **Acuerdo del equipo sobre la tabla:** el consenso muestra la respuesta de cada evaluador con su nombre, marca Coinciden o Difieren, filtro "Solo diferencias" y permite hallazgos nuevos del equipo (máximo 50).

Qué hallazgo de las sesiones motivó cada cambio queda por registrar en el Sprint 11 (ver `docs/sprints/sprint11.md`).

## Pendientes y verificación

- [ ] Completar la tabla de resultados con la matriz anonimizada.
- [ ] Actualizar en el backlog J4 y J5 a Completado y registrar horas reales.
- [ ] Registrar el acta de la reunión del 23-10-2026 en la hoja "Reuniones Profesor" (R10).
- [ ] Registrar en `docs/ARCHITECTURE.md` el avance de este sprint (hito de J5). Hoy el archivo no tiene sección posterior al Sprint 6.