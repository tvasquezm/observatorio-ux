# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## Unreleased

### Features

* **card-sorting:** umbral de consenso editable en los resultados (50–95%, desde
  el valor del curso): recalcula Tarjetas, Categorías, "Sin consenso", CSV y PDF
  en el navegador, con botón Restablecer y parámetro `?umbral=`. La matriz de
  similitud marca con borde los pares sobre el umbral y el PDF agrega la
  sección "Tarjetas sin consenso".
* **card-sorting:** experiencia del participante: la intro estima el tiempo y
  muestra 3 pasos; barra de progreso fija ("12 de 30 clasificadas") con aviso de
  avance guardado; confirmación antes de enviar (resumen + Revisar / Enviar
  ahora) y pantalla final con lo enviado.
* **layout:** el selector "Viendo como" solo se muestra a docentes y administradores;
  las cuentas de estudiante ya no lo ven.
* **card-sorting:** exportación por vista en "Vistas del estudio": un botón "CSV"
  y "PDF" que exportan la pestaña activa, y "PDF completo" con todas las vistas.
  El CSV pasa a separar con `;` (Excel con coma decimal) y trae columnas
  legibles (estado, categoría principal, porcentajes). El PDF usa la marca del
  informe general; Tarjetas incluye barras de distribución y las matrices
  anchas salen apaisadas.
* **card-sorting:** ayuda contextual con ⓘ (`InfoTip`) en la creación del
  estudio y menos texto visible; guía de 8 pasos con una sola numeración;
  íconos `info`, `download` y `refresh`.
* **card-sorting:** creación del estudio guiada: tipo en tarjetas seleccionables,
  campo "Agregar una" con chips en vivo y medidor del rango de tarjetas.
* **card-sorting:** las pestañas Tarjetas y Categorías de los resultados muestran
  barras por categoría, estado de consenso, búsqueda, orden, filtro y enlaces
  entre ambas.
* **card-sorting:** cada campo de la creación tiene una sola entrada con dos modos
  ("De a una" y "Pegar lista" con reglas y vista previa); el rango recomendado
  de tarjetas baja a 15–40.
* **card-sorting:** panel "Tu estudio" con el avance en vivo y guía plegable.
* **card-sorting:** resultados con menos texto: ayudas en ⓘ, botones de ícono
  y pestañas más cortas ("Matriz", "Populares").

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

* **card-sorting:** los ⓘ del formulario de creación volvieron junto a su etiqueta.
* **card-sorting:** dendrograma con líneas, etiquetas y eje (faltaba el CSS),
  pestañas de resultados con degradado y scroll visible, y estilos de las
  vistas de resultados.

* **card-sorting:** estilos faltantes de la guía (doble numeración y marcador
  nativo de `<details>`) y de los contadores del formulario.

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
* **ui:** quita las etiquetas decorativas sobre los títulos en card sorting
  (estudios, workspace y resultados), evaluación heurística y analítica, y
  elimina el estilo `.kicker`/`.eyebrow`, que ya no tiene usos.

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
