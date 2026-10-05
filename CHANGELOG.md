# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

### Features

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
