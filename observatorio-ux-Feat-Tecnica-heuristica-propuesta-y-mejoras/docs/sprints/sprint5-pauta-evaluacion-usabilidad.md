# Sprint 5 — pauta borrador de evaluación de usabilidad

Estado: borrador listo para revisión del profesor. No enviado todavía.

## Objetivo

Evaluar si estudiantes y docentes pueden completar los flujos principales del
Observatorio UX con efectividad, eficiencia y satisfacción, e identificar
problemas que deban resolverse antes de una evaluación formal.

## Participantes y contexto

- 5 a 8 estudiantes que hayan cursado o estén cursando asignaturas de UX.
- 2 a 3 docentes que supervisen proyectos o actividades de investigación UX.
- Equipo de escritorio o portátil para tareas administrativas; teléfono móvil
  para validar el acceso por enlace del participante.
- Datos ficticios. No registrar contraseñas, tokens ni datos personales ajenos
  a lo consentido.

Antes de comenzar, explicar el objetivo, pedir consentimiento para tomar notas
y aclarar que se evalúa el sistema, no a la persona.

## Guion de moderación

1. Presentar el escenario sin enseñar dónde están los controles.
2. Pedir a la persona que piense en voz alta.
3. No intervenir durante 60 segundos, salvo bloqueo o malestar.
4. Registrar resultado, tiempo, errores, dudas y ayuda solicitada.
5. Aplicar una pregunta SEQ de 1 a 7 después de cada tarea.
6. Al finalizar, aplicar SUS y preguntas abiertas.

## Tareas

| ID | Perfil | Escenario y resultado esperado |
|---|---|---|
| T1 | Todos | Iniciar sesión y reconocer proyectos, salas y rol actual. |
| T2 | Estudiante | Abrir un proyecto y localizar Persona, Journey Map, Momentos Críticos, Card Sorting y Evaluación Heurística. |
| T3 | Estudiante | Crear o editar un artefacto permitido y confirmar que el cambio queda visible. |
| T4 | Docente | Crear una sala, revisar participantes y abrir un proyecto asociado. |
| T5 | Docente | Crear un estudio Card Sorting, obtener su enlace y revisar su estado. |
| T6 | Participante | Abrir el enlace de Card Sorting, identificarse, ordenar tarjetas y reanudar tras recargar la página. |
| T7 | Docente | Revisar resultados de Card Sorting e interpretar una coincidencia o agrupación. |
| T8 | Administrador | Cambiar el rol de una cuenta sin modificar su propia cuenta administrativa. |
| T9 | Administrador | Crear, editar y eliminar lógicamente un proyecto; verificar el avance de sus sesiones. |
| T10 | Estudiante | Intentar abrir `/admin` y comprobar que vuelve al dashboard sin mostrar información administrativa. |

## Registro por tarea

| Campo | Valor |
|---|---|
| Participante / perfil | |
| Tarea | |
| Resultado | Éxito / éxito con ayuda / fallo |
| Tiempo | mm:ss |
| Errores o retrocesos | |
| Ayuda solicitada | Ninguna / moderada / alta |
| SEQ | 1 muy difícil — 7 muy fácil |
| Observaciones y cita breve | |

## Criterios de aceptación del piloto

- Al menos 80 % de las tareas críticas T1, T5, T6, T8 y T9 se completan sin
  ayuda del moderador.
- Ningún participante queda bloqueado al abrir o reanudar Card Sorting por
  enlace.
- No se expone el panel ni los endpoints administrativos a roles no ADMIN.
- Todos los controles esenciales se pueden usar con teclado y conservan foco
  visible; en móvil, los objetivos táctiles esenciales miden al menos 44 px.
- Cada hallazgo incluye severidad, evidencia, flujo afectado y recomendación.

## Cuestionario posterior

Aplicar los 10 ítems de la System Usability Scale (SUS) en escala de 1 a 5 y
calcular el puntaje estándar de 0 a 100. Complementar con:

1. ¿Qué parte te resultó más clara?
2. ¿Dónde dudaste o esperabas que ocurriera algo distinto?
3. ¿Qué información faltó para tomar una decisión?
4. Si pudieras cambiar una sola cosa, ¿cuál sería?

## Entregables de la evaluación

- Matriz anonimizada de resultados por tarea.
- Listado priorizado de hallazgos: crítico, alto, medio o bajo.
- Evidencia visual solo cuando exista consentimiento.
- Decisiones de mejora y criterio de revalidación.

## Lista previa al envío

- [ ] Profesor valida perfiles, tamaño de muestra y tareas.
- [ ] Profesor valida consentimiento y tratamiento de datos.
- [ ] Equipo define fechas, responsables y herramienta de registro.
- [ ] Se ejecuta una sesión piloto y se ajusta el guion.
