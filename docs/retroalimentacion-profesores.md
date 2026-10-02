# Seguimiento de la retroalimentación del Observatorio UX

Este registro transforma las evaluaciones de María de los Ángeles Ferrer y
Ronald Méndez en cambios y tareas de validación. María fechó su formulario el
28 de septiembre de 2026; Ronald dejó la fecha pendiente. Las prioridades de
este registro son propuestas del equipo, no prioridades marcadas por los
evaluadores. Ningún formulario registra una decisión formal de aceptación.

## Cambios de esta entrega

- Card Sorting: validar la configuración tanto en la interfaz como en la API,
  con mensajes que permitan corregir campos vacíos, tarjetas repetidas,
  categorías repetidas y estudios cerrados sin categorías. Conservar los
  datos del formulario cuando hay un error.
- Navegación: menú desplegable de secciones del proyecto, agrupado en Proyecto
  y Técnicas, con la sección actual visible y las restricciones de acceso
  existentes. Todos los accesos disponibles se pueden ver sin desplazamiento
  horizontal.
- Información: en Card Sorting, abrir la configuración solo al crear un estudio;
  consultar la ayuda, el enlace completo y los análisis complementarios cuando
  se necesitan. Mantener visibles los mensajes de error y la advertencia de
  que la práctica no forma parte de los resultados.
- Contraste: ofrecer alto contraste y contraste normal, con preferencia
  persistente e independiente del modo claro u oscuro.

Estos cambios atienden aspectos concretos de las observaciones. No permiten
dar por resuelta la evaluación metodológica de Card Sorting ni sustituir la
prueba con usuarios solicitada por ambos profesores.

## Pendientes y criterios de cierre

| Referencia | Observación de origen | Próxima acción y evidencia de cierre | Prioridad propuesta |
| --- | --- | --- | --- |
| E-12 | Ronald: la configuración de Card Sorting aún no cumple y el análisis debe probarse con usuarios | Revisar un estudio abierto y uno cerrado con Ronald; documentar qué falta en la configuración y contrastar los resultados con clasificaciones conocidas | Alta |
| E-09, E-11, E-13, E-17 | Ronald marca «No cumple» para Persona, Momentos Críticos, Heurística y PDF sin explicar los motivos | Precisar los motivos por entregable y acordar un ejemplo que demuestre la corrección; las casillas no identifican por sí solas un defecto técnico | Alta |
| E-10 | Ronald marca «Cumple parcialmente» para Journey Map | Identificar qué parte falta y reevaluar el entregable con un caso completo | Alta |
| T-01, T-04 | María no pudo navegar la plataforma; Ronald deja navegación como NA y rendimiento sin calificar | Dar acceso a un entorno de evaluación con cuentas individuales y proyectos de prueba; registrar tareas completadas, obstáculos y tiempos | Alta |
| T-03 | María solicita menos texto y mensajes más simples | Revisar textos durante tareas reales y registrar las dudas de los usuarios; este PR comienza por Card Sorting | Media |
| E-04, T-02 | María solicita contraste normal/alto y mayor uso de identidad visual; Ronald pide pruebas del diseño | Probar ambos contrastes en escritorio y móvil; confirmar con el Observatorio la tipografía y paleta oficiales antes de cambiar la identidad | Media |
| E-09 a E-13, E-16 | María pide visualización de datos mediante lienzos | Revisar las vistas existentes con María y acordar qué datos deben aparecer en cada lienzo antes de ampliarlas | Media |
| Flujos por precisar | María pide mejorar algunos flujos; Ronald valora su desarrollo | Identificar el recorrido y paso concreto que genera dificultad, sin asumir que todos los flujos deben rehacerse | Media |

## Sesión de evaluación navegable

1. Registrar versión o commit, URL, fecha, evaluador, rol y dispositivo. Crear
   cuentas individuales con los permisos existentes; no compartir credenciales
   ni utilizar datos personales reales para la prueba.
2. Pedir al evaluador que encuentre un proyecto y revise sus técnicas sin una
   demostración guiada. Registrar éxito, dudas y bloqueos.
3. Configurar un Card Sorting abierto y uno cerrado. Probar campos vacíos,
   tarjetas repetidas y categorías repetidas; verificar que se explica el error
   y se conserva el contenido para corregirlo.
4. Compartir cada estudio por el flujo existente de invitación y consentimiento.
   Completar la clasificación como participante, también mediante teclado o
   selección y botones, y comprobar que las respuestas llegan al estudio.
5. Preparar tres tarjetas A, B y C y dos respuestas conocidas: la primera agrupa
   A y B; la segunda agrupa B y C. En la matriz de similitud, A-B y B-C deben
   tener 50 %, A-C 0 % y la diagonal 100 %. Revisar además las frecuencias por
   categoría con Ronald. Este caso es un control técnico, no validación con
   usuarios reales.
6. Revisar Persona, Journey Map, Momentos Críticos y Heurística; exportar PDF y
   comparar el contenido con el proyecto. Anotar los motivos concretos de cada
   «No cumple» o «Cumple parcialmente».
7. Alternar contraste normal/alto y modo claro/oscuro. Recargar y comprobar la
   preferencia. Revisar textos, controles, foco y desplazamiento en escritorio
   y móvil; registrar incidencias, sin inferir conformidad de accesibilidad a
   partir de pruebas automatizadas.
8. Completar las calificaciones pendientes, solicitudes de cambio, decisión
   formal de aceptación y fecha de nueva revisión. No contar campos vacíos o
   NA como cero ni como conformidad.

## Registro de evidencia

Por cada tarea, registrar resultado observado, evidencia, incidencia asociada
y decisión del evaluador. Cerrar un pendiente metodológico o de aceptación
solo después de su revisión explícita; el paso de los tests técnicos no
constituye aceptación del cliente.
