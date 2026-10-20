# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

### Features

* **journey-map:** crear un Journey Map es ahora un paso a la vez (perfil, objetivo, fases, emociones y dolor,
  oportunidades, evidencia), con el círculo de avance en vivo, Anterior y Siguiente siempre visibles y Guardar
  en el último paso; las instrucciones empiezan plegadas.
* **momentos-criticos:** registrar un momento crítico es ahora un paso a la vez (perfil, incidentes, causas, impacto y
  frecuencia, acciones), con el círculo de avance en vivo y Guardar en el último paso; las instrucciones empiezan
  plegadas y la lista y el resumen se ocultan mientras se edita.
* **tecnicas:** el avance de las técnicas se muestra como un círculo que se llena y se anima al
  completarse; cuando todos los pasos están hechos, el proceso avisa que la técnica está completa
  y lista para usar. El proceso muestra solo la fase actual ("Fase n de N") y cambia a la siguiente al avanzar. Las fases opcionales se indican como tales, la técnica queda lista sin ellas y un icono muestra cuáles faltan. La evaluación heurística usa el mismo círculo en Revisar y en el progreso del equipo.
* **evaluacion-heuristica:** simplifica el módulo existente con configuración compacta,
  respuestas visibles, mapa de preguntas y resumen del equipo.
  Permite comenzar la revisión directamente
  y deja los datos de contexto como opcionales. «No aplica» completa una pregunta sin
  valoración ni motivo y se reconoce en entrega, progreso, consenso e informes.
* **evaluacion-heuristica:** las capturas se adjuntan pegándolas con Ctrl+V o arrastrándolas, se validan por contenido antes de subir y muestran el límite real de 4 MB; se suman la cabecera y el proceso de la técnica y se unifica "hallazgo" como "problema".
* **evaluacion-heuristica:** Revisar usa toda la página, con Anterior y Siguiente fijos abajo; la técnica recuerda la revisión abierta y la pregunta al cambiar de pestaña y ofrece "Retomar mi última revisión".
* **evaluacion-heuristica:** Acordar usa toda la página, con las acciones fijas abajo y los originales junto a las decisiones; al crear una decisión se avisa y se lleva el foco a ella, se explica por qué el botón está inactivo y los botones se ordenan en principal, secundario, ghost y danger.
* **evaluacion-heuristica:** cada pregunta de Revisar es una tarjeta con atajos de teclado (1 a 5 y N) y avance automático opcional a la siguiente pregunta; el problema se registra en la misma tarjeta.
* **evaluacion-heuristica:** la revisión se reparte en rondas de hasta 4 preguntas con pausa y resumen al terminar cada una, revisión final con lo pendiente y lista de comprobación por ronda.
* **navegacion:** la barra lateral comienza abierta y conserva la elección manual
  del usuario, sin cerrarse al navegar o pulsar el contenido.

* **navegacion:** menú de proyecto por grupos con iconos, sección actual y apertura
  animada que respeta movimiento reducido; conserva el menú al cancelar una
  navegación y devuelve el foco al elegir la sección actual.
* **tecnicas:** vistas de Personas, Journey Map y Momentos críticos con visuales
  propios; evaluación heurística con edición, capturas y analítica por heurística.
* **borradores:** conserva los cambios escritos durante la subida de capturas y
  confirma antes de abandonar, cancelar, reemplazar una edición o finalizar la evaluación.
* **evaluacion-heuristica:** el consenso registra una lista de aspectos positivos y una conclusión con
  recomendaciones finales (campos opcionales, solo del consenso); ambos salen en el informe y en el PDF
  cuando tienen contenido, y las evaluaciones anteriores se ven igual.
* **evaluacion-heuristica:** el consenso admite una lista de mejoras antes/después con capturas; el
  coordinador y los expertos pueden adjuntar capturas durante el consenso y los lectores ven las del informe
  consolidado. El editor de consenso tiene la sección "Mejoras antes/después" (capturas sin anotar, hasta 10
  por lado); el informe y el PDF la muestran solo si hay mejoras.
* **evaluacion-heuristica:** evita el desbordamiento horizontal causado por el
  campo oculto de adjuntos; conserva su etiqueta accesible y el botón para subir capturas.

* **evaluacion-heuristica:** descarga un PDF de la evaluación (resumen, hallazgos por severidad,
  responsable y capturas incrustadas, hasta 30) y amplía el resumen con críticos,
  severidad promedio, hallazgos sin evidencia y desglose por heurística.

* **database:** migra a Prisma 7.10.0 con cliente generado, adaptador PostgreSQL,
  configuración de migraciones y seeds TypeScript; conserva schema, límites de
  conexiones y timeout de DATABASE_URL en la API y los scripts de administración.
  Comprueba PostgreSQL con una consulta al iniciar, antes de exponer la API.

* **ux-ui:** protege cierres de borradores, distingue errores de proyectos y permite
  elegir el proyecto activo; mejora navegación, foco, etiquetas, contraste y diseño móvil.

* **card-sorting:** unifica la configuración guiada, las vistas Tarjetas/Categorías y
  exportaciones CSV/PDF del PR #28 con la validación compartida, los desplegables,
  el menú de proyecto y el alto contraste del PR #27; conserva el backend de main.
* **momentos-criticos:** agrega lectura completa, búsqueda, filtros y matriz accesible;
  valida los campos requeridos, protege borradores y espera el bloqueo de edición.
* **card-sorting:** recalcula las agrupaciones al explorar otro umbral de consenso;
  conserva los campos ampliados de Journey Map en la exportación de informes.
* **card-sorting:** evita mezclar la cookie del evaluador con el Bearer del participante
  al probar un estudio en el mismo navegador; agrega cobertura E2E del flujo completo.

* **persona:** amplía la ficha con rol y relación con el servicio,
  características distintivas, evidencia y validación del perfil.
* **persona:** organiza el formulario en cuatro secciones con etiquetas visibles
  y presenta fichas con objetivos, necesidades y detalle desplegable; mantiene
  la paleta, tipografías, modo oscuro y adaptación móvil del proyecto.
* **reports:** incorpora endpoints PDF y JSON por proyecto, con control de acceso.

* **auth:** límite de 300 participantes anónimos/hora por proyecto en
  `accessParticipant` (configurable con `PARTICIPANTS_ACCESS_LIMIT_PER_HOUR`)
  y limpieza horaria de participantes huérfanos sin consentimiento ni
  sesión (Fase 7 del plan de remediación, H5).

* **load-test:** agrega `tests/load/participante.k6.js` (Fase 6 del plan de
  remediación) — prueba de carga del flujo access → consent → join →
  results con rampa hasta 200 VUs.

* **e2e:** incorpora Playwright para validar login, proyecto, las cinco
  técnicas UX, restricciones por rol y responsive en escritorio/móvil.
* **responsive:** reorganiza navegación, formularios y acciones para pantallas
  táctiles, con targets mínimos de 44 px y soporte de safe areas.
* **salas:** el docente dueño de una sala ahora puede ver los proyectos,
  sesiones y analítica de sus estudiantes, y comentar en sus artefactos. No
  puede editar artefactos, cerrar estudios ni gestionar miembros: eso sigue
  reservado al creador del proyecto o a un ADMIN.
* **heuristica-flujo:** constructor guiado de métodos en 4 pasos: partir de una
  metodología o de cero, pegar una lista de criterios, escala predefinida (Sí/No,
  1 a 5, Nielsen 0 a 4) o distinta por criterio, y vista previa del formulario del evaluador.
* **heuristica-flujo:** editar y borrar los métodos propios desde la biblioteca; solo el autor
  puede hacerlo y las evaluaciones ya creadas no cambian.
* **heuristica-flujo:** checklist web de Hassan y Martín (71 ítems Sí/No, 11 categorías,
  redacción propia) y vista de lista de comprobación para el evaluador: ítems agrupados por
  categoría con "n de N respondidos"; se usa cuando todos los criterios tienen dos niveles.
* **heuristica-flujo:** los niveles de una escala pueden marcar si la respuesta es favorable
  (campo opcional `favorable`); la escala Sí/No marca Sí como favorable. Nuevas funciones
  `clasificarCriterios` y `resumirCumplimiento` calculan el cumplimiento por categoría; las
  evaluaciones anteriores, sin ese campo, no cambian.
* **heuristica-flujo:** el informe y su PDF muestran "n de N cumplen (x %)" por categoría y total,
  en texto; solo aparece si la escala define respuestas favorables.
* **heuristica-flujo:** rúbrica UTEM del curso Experiencia de Usuario en el catálogo (22 preguntas con nota
  de 1 a 5 en seis conceptos, con las etiquetas del documento); las tres preguntas abiertas de Experiencia
  no son criterios.
* **heuristica-flujo:** "Guardar borrador de evaluación" queda deshabilitado, con aviso en texto, si la
  metodología no tiene criterios (antes el servidor respondía "Datos inválidos.").
* **heuristica-flujo:** el consenso de un checklist agrupa los criterios por categoría y la agenda de
  discrepancias indica en texto qué respuestas difieren ("Difieren: Sí / No").

### Fixes

* **deps:** actualiza los overrides de brace-expansion, fast-uri y multer a
  versiones corregidas; elimina las alertas encontradas por `pnpm audit`.

* **reports:** usa las fuentes incluidas en pdfmake, restringe sesiones privadas
  por evaluador y exporta las relaciones de Card Sorting en JSON/PDF.
* **persona:** incluye los nuevos campos de evidencia, relación con el servicio
  y validación en el PDF de la interfaz; conserva defaults al leer fichas antiguas.

* **docker:** `docker compose up` reinstala las dependencias de cada servicio
  cuando cambia `pnpm-lock.yaml`, sin necesidad de `down` ni `up --build -V`
  tras un `git pull`.

* **artifacts:** libera locks de edición al cancelar, cambiar de artefacto o
  abandonar la ruta, incluso si la adquisición termina de forma tardía.
* **shared-types:** centraliza contratos de autenticación y Card Sorting; el
  formulario de Card Sorting ahora envía tarjetas/categorías con el shape que
  valida el backend.

### BREAKING CHANGE

* **auth:** nueva env var obligatoria `JWT_PARTICIPANTE_SECRET` (Regla de
  negocio: Segregación de Auth — evaluadorToken y participanteToken ya no
  comparten secreto de firma). El backend no arranca sin ella. Agregarla a tu
  `.env` (y `apps/backend/.env` si no usás Docker) — ver `env.example`.

## 1.0.0 (2026-08-03)

### Features

* **card-sorting:** implementa arquitectura end-to-end, modelo relacional 3FN y UI ([6d00368](https://github.com/tvasquezm/observatorio-ux/commit/6d003685565592dc3958b06d3f12d84ef1ea37f0))
