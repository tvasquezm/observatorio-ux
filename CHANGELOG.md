# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

### Features

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

* **ui:** contraste AA en el texto secundario (tokens y grises del tema
  claro), tamaño mínimo de texto de 12 px, menos mayúsculas con tracking y
  fuente Inter autoalojada (`@fontsource-variable/inter`, requiere
  `pnpm install`).

* **ui:** completa el rebrand a índigo: reemplaza por tokens 149 colores de la
  paleta verde-azulada anterior (texto, bordes, fondos y sombras), agrega
  tokens para texto sobre navy, acentos suaves y botón primario, y reduce los
  overrides del modo oscuro. Corrige el hover del botón primario deshabilitado,
  que cambiaba a verde-azulado.

* **ui:** reemplaza los glifos Unicode usados como íconos (`◆ ✣ ▣ ⚑ ◌ ⌁ ✚ ▦ ✦ ⌕`)
  por un set de íconos SVG propio (`Icon`), sin dependencias nuevas. Los
  íconos decorativos quedan ocultos para lectores de pantalla.
* **ui:** el breadcrumb es una `<nav>` con enlaces y el nombre real del
  proyecto, y cada pantalla fija un título de documento propio
  (`useDocumentTitle`).
* **ui:** las cabeceras de tabla declaran `scope`, `prefers-reduced-motion`
  sustituye las animaciones por fundidos breves en vez de apagarlas, el alto de
  pantalla usa `dvh` y los espaciados en línea pasan a clases.
* **ux:** salir de un formulario con cambios sin guardar usa el modal de la
  app en vez de `window.confirm`, y el card sorting en pantallas táctiles indica
  seleccionar y usar "Mover aquí" en vez de arrastrar.
* **ui:** quita las etiquetas decorativas sobre los títulos en la cabecera del
  proyecto, el dashboard, Personas, Journey, Momentos críticos y las pantallas
  de error; el dashboard reemplaza las tarjetas de métricas por una franja de
  datos; los avisos, notas y callouts pasan del borde lateral de color a un
  fondo tintado, y los avisos de error, éxito e información se distinguen por
  borde y fondo.
* **ui:** quita las etiquetas decorativas sobre los títulos en proyectos,
  comentarios, salas, administración y el flujo del participante; las tarjetas
  de proyecto dejan de repetir su estado ya visible en el conteo de sesiones.

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
