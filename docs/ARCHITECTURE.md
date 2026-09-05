# Arquitectura — Observatorio UX

Este documento registra las decisiones de arquitectura relevantes del proyecto, sprint a sprint. Cada entrada explica **qué se decidió**, **por qué**, **qué alternativas se descartaron** y **cómo funciona en la práctica**, para que el equipo (y evaluadores) puedan entender el razonamiento sin tener que reconstruirlo desde el código o el backlog.

---

## Sprint 1 — Base técnica estable + módulo Proyectos

Foco del sprint: dejar el monorepo (pnpm, NestJS + Prisma en backend) en un estado estable y funcional, con autenticación por roles (`RolesGuard`: ESTUDIANTE / DOCENTE / ADMIN) y el CRUD base de Proyectos operativo.

Decisiones clave:
- El secreto JWT se movió a `ConfigService` (`.env`), eliminando el hardcodeo previo.
- Se implementó `RolesGuard` como guard reutilizable para todos los módulos futuros, en vez de validar roles manualmente en cada controller.
- Se estandarizó `ParseUUIDPipe` en los parámetros de ruta de todos los módulos, para que un ID malformado devuelva 400 en lugar de 500.

*(Sección resumida — completar con más detalle si se requiere para la memoria del proyecto.)*

**Corrección post-auditoría (cierre real de A4 — endpoint `/auth/test-token`):** el endpoint no se removió, se gatea con `if (nodeEnv === 'production') throw NotFoundException()`. El riesgo real detectado: `NODE_ENV` tenía `.default('development')` en `env.validation.ts`, así que un despliegue que se olvidara de setear esa variable arrancaba igual, en modo `development`, dejando el endpoint de bypass de autenticación abierto sin que nadie lo notara. Se cambió a `.required()`: ahora la app no arranca si falta `NODE_ENV`, en vez de arrancar silenciosamente en el modo equivocado. Verificado con `env.validation.smoke.spec.ts`.

---

## Sprint 2 — Backends de Persona, Journey Map y Momentos Críticos

### 1. Decisión arquitectónica: modelo genérico `UxArtifact` en vez de 3 schemas separados

**Planteamiento original (backlog):** cada uno de los tres módulos de investigación —Persona, Journey Map y Momentos Críticos— iba a implementarse con su propio schema de Prisma, su propia migración, su propio service y su propio controller (tareas B1–B5, B6–B10 y B11–B15 respectivamente), siguiendo el mismo patrón ya usado en Card Sorting y Evaluación Heurística.

**Lo implementado:** un único modelo de datos, `UxArtifact`, con un campo polimórfico `tipo: TipoArtefacto` (enum con valores `PERSONA`, `JOURNEY_MAP`, `MOMENTOS_CRITICOS`) y un campo `contenido: Json` cuya forma se valida en tiempo de ejecución con schemas de Zod específicos por tipo. Sobre este modelo se construyó un único módulo, `ArtifactsModule` (controller + service + DTOs), que expone el CRUD, el versionado append-only y el bloqueo pesimista con TTL de forma compartida para los tres tipos.

**Motivación del cambio:**
- **Simplicidad frente a la complejidad real del dominio.** Los tres tipos comparten exactamente el mismo ciclo de vida (crear, versionar sin sobrescribir, bloquear mientras se edita), así que modelarlos como 3 entidades independientes agregaba complejidad estructural sin agregar valor.
- **Evitar redundancia y duplicación.** Con 3 schemas separados, la lógica de versionado y de bloqueo habría tenido que reimplementarse (o abstraerse después) 3 veces. El modelo genérico la centraliza en un solo lugar.
- **Optimización de tiempo de desarrollo.** Un módulo genérico bien probado cubre los 3 casos de uso, en vez de mantener 3 módulos, 3 suites de test y 3 migraciones en paralelo.
- La recomendación de este enfoque surgió de consultar varias herramientas de IA sobre el diseño; el equipo evaluó las razones anteriores y decidió adoptarlo.

**Trade-off aceptado:** la validación específica de cada tipo de artefacto ya no vive en el schema de la base de datos (no hay una tabla `personas` con columnas propias tipadas), sino en la capa de aplicación, vía Zod (`PersonaSchema`, `JourneyMapSchema`, `MomentosCriticosSchema`). La integridad de la forma del `contenido` depende de que el service siempre pase por la validación correspondiente — no la garantiza la base de datos por sí sola.

**Estado:** las tareas B1–B15 del backlog original quedaron cubiertas por esta implementación única (`ArtifactsModule`), aunque no siguieron el desglose original tarea por tarea de cada módulo.

---

### 2. Versionado append-only

**Qué es:** cada vez que se edita un artefacto (Persona, Journey Map o Momentos Críticos), no se sobrescribe el registro existente. En vez de eso, se crea una fila nueva en `UxArtifact` con un número de versión incrementado, y las versiones anteriores quedan intactas en la base de datos.

**Cómo funciona (mecanismo):**
- Todas las versiones de un mismo artefacto comparten el mismo `artefactoLogicoId` (un UUID que identifica "el artefacto" como concepto, independiente de cuántas versiones tenga).
- El campo `version` (entero) se incrementa en cada edición: la primera versión nace con `version: 1`.
- Al crear una nueva versión, el service busca la versión más alta existente para ese `artefactoLogicoId` (`findFirst` ordenado por `version: 'desc'`) y crea la siguiente (`latest.version + 1`), en vez de hacer un `update`.
- Existe una restricción de unicidad `@@unique([artefactoLogicoId, version])` a nivel de base de datos, que impide que dos versiones del mismo artefacto lógico compartan número de versión — la integridad del historial no depende solo de la lógica de la aplicación.
- El `tipo` de una nueva versión siempre se hereda del artefacto lógico ya existente, no del payload que envía el cliente — así se evita que alguien "cambie de tipo" un artefacto a mitad de su historial de versiones.

**Por qué se decidió así:** el objetivo es preservar el historial completo de cómo evolucionó un artefacto de investigación (por ejemplo, cómo cambió el Journey Map a medida que se refinaba con más evidencia). Sobrescribir el registro perdería esa trazabilidad, que es valiosa tanto para el proceso de investigación UX como para poder auditar o revertir cambios.

---

### 3. Bloqueo pesimista con TTL (Time To Live)

**Qué es:** un mecanismo para evitar que dos personas editen la misma versión de un artefacto al mismo tiempo y una sobrescriba el trabajo de la otra sin darse cuenta.

**Cómo funciona (mecanismo):**
- El modelo `UxArtifact` tiene dos campos para esto: `lockedById` (quién tiene el bloqueo) y `lockedUntil` (hasta cuándo es válido ese bloqueo).
- Cuando alguien intenta crear una nueva versión (`createVersion`), el service revisa: si `lockedById` pertenece a **otro** usuario y `lockedUntil` todavía no ha pasado (`lockedUntil > new Date()`), la operación se rechaza con un `409 Conflict` ("El artefacto está bloqueado por otro usuario").
- Si el bloqueo ya expiró (`lockedUntil` en el pasado) o si el usuario que intenta editar es el mismo que tiene el lock, la operación procede con normalidad.
- El TTL evita el problema clásico del bloqueo pesimista "duro": si alguien bloquea un artefacto y luego cierra el navegador sin liberar el lock explícitamente, el bloqueo expira solo después de un tiempo, en vez de dejar el artefacto bloqueado indefinidamente.

**Por qué se decidió así:** en un contexto de investigación colaborativa (varios estudiantes/evaluadores pueden trabajar sobre el mismo proyecto), el riesgo de que dos personas editen el mismo artefacto simultáneamente y una pierda su trabajo es real. Un bloqueo optimista (detectar el conflicto recién al guardar) se descartó a favor de uno pesimista con expiración automática, que avisa del conflicto *antes* de que la segunda persona invierta tiempo editando, sin el riesgo de bloqueos permanentes por sesiones abandonadas.

**Corrección post-auditoría (cierre real de B4/B9/B14):** la primera versión de este mecanismo solo tenía el lado de *lectura* del lock: `createVersion` sabía interpretar `lockedById`/`lockedUntil`, pero ningún endpoint los escribía, así que en la práctica el lock nunca se activaba. Se agregaron dos endpoints nuevos en `ArtifactsController`/`ArtifactsService`:
- `POST /projects/:proyectoId/artifacts/:artefactoId/lock` (`acquireLock`) — adquiere el lock sobre la **última versión** del artefacto lógico (no sobre la fila específica de la URL, para que el chequeo sea correcto aunque el cliente tenga abierta una versión vieja). Si el propio usuario ya lo tenía, lo renueva (soporta "heartbeats" desde el frontend mientras el usuario sigue editando). TTL configurable vía `ttlSegundos` en el body (tope 30 min), default 5 min.
- `DELETE /projects/:proyectoId/artifacts/:artefactoId/lock` (`releaseLock`) — libera el lock. Solo el dueño del lock o un ADMIN pueden liberarlo explícitamente; liberar un lock ya expirado es idempotente y no falla.

El frontend debe llamar a `acquireLock` al entrar a un formulario de edición y a `releaseLock` al salir (o dejar que expire el TTL como red de seguridad). Guardar una versión (`createVersion`) no libera el lock explícitamente: como cada versión nace en una fila nueva sin lock, el efecto práctico es el mismo.

---

### 4. Relación con el "ADR Master"

El encabezado de `schema.prisma` referencia un **ADR Master** ("Refleja el ADR Master: modelo dual, bloqueo pesimista, consentimiento") como la fuente de las decisiones de fondo que el schema implementa. Si ese ADR existe como documento aparte, debería enlazarse aquí; si todavía no se ha formalizado por separado, las secciones 1–3 de esta entrada cumplen ese rol mientras tanto y deberían migrarse a un ADR dedicado cuando el equipo formalice ese proceso.

### 5. Consolidación de rutas: un solo idioma (inglés)

**Qué se encontró:** `ProjectsController` y `ArtifactsController` tenían `@Controller([...])` con un array de dos prefijos, sirviendo la misma implementación bajo dos idiomas a la vez: `/api/projects` y `/api/proyectos` (y sus equivalentes `/artifacts` / `/artefactos`). No era una duplicación de código —un solo controller, un solo service— sino dos alias de URL para el mismo endpoint. `EvaluacionHeuristicaController` y `CardSortingController` no tenían este patrón: solo exponían su ruta en español/técnico único.

**Decisión:** el equipo decidió quedarse con **un solo idioma para toda la API: inglés**. Se quitó el alias en español de `ProjectsController` (`@Controller('projects')`) y `ArtifactsController` (`@Controller('projects/:proyectoId/artifacts')`). Rutas afectadas — dejan de existir `/api/proyectos/*` y `/api/proyectos/:proyectoId/artefactos/*`; siguen existiendo `/api/projects/*` y `/api/projects/:proyectoId/artifacts/*` (incluyendo `/lock` de B4/B9/B14).

**Resolución:** `EvaluacionHeuristicaController` y su controlador de analítica fueron migrados a `projects/:proyectoId/evaluacion-heuristica/...`. El frontend y la documentación se actualizaron en conjunto, por lo que toda la API mantiene ahora la convención de rutas en inglés.

### 6. Helmet + rate limiting

**Helmet** (`app.use(helmet())` en `main.ts`) agrega los headers de seguridad HTTP estándar (anti-clickjacking, MIME sniffing, etc.) que Express/Nest no ponen por defecto. Costo prácticamente nulo, sin trade-offs — se agregó sin condicionar nada.

**Rate limiting** (`@nestjs/throttler`), aplicado en dos niveles:
- **Global**: 60 requests/minuto por IP en toda la API (`ThrottlerModule.forRoot` + `ThrottlerGuard` como `APP_GUARD` en `app.module.ts`).
- **Más estricto en `AuthController`**: `POST /auth/login` a 5/min (blanco directo de fuerza bruta contra contraseñas), y los tres endpoints de `participants/*` a 10/min (no requieren credenciales previas — cualquiera puede intentar registrar emails o pedir tokens de participante en loop).

`/auth/test-token` y `/auth/test-participant-token` quedaron con el límite global (60/min) — ya están gateados por `NODE_ENV` (ver A4 más arriba), así que el rate limit ahí es una capa extra, no la protección principal.

**Probado en real** contra `POST /auth/login`: 5 intentos consecutivos devuelven `401` (credenciales inválidas, como se espera), el 6° y 7° devuelven `429 Too Many Requests`. La respuesta también trae los headers `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset`, y los headers de Helmet (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, etc.) aparecen en toda respuesta.

---

## Cómo usar este documento

Al cerrar cada sprint, agregar una sección con: foco del sprint, decisiones clave tomadas, motivación, alternativas descartadas, mecanismo de funcionamiento y trade-offs aceptados. Priorizar registrar **decisiones que se desvían de lo planeado originalmente** (como el pivote de Sprint 2), ya que son las que más valor aportan para entender el proyecto más adelante.

---

## Sprint 3 — Sistema de manejo de errores (backend + frontend), integración Persona/Journey Map/Momentos Críticos

Foco del sprint: antes de construir las interfaces de las tres técnicas UX, dejar un sistema base de manejo de errores nativo y de costo cero (sin librerías de terceros de pago), consistente entre backend y frontend.

### 1. Formato de error estandarizado (plano)

**Qué se decidió:** todo error HTTP (400/401/403/404/409/500) responde con la misma forma:
```json
{
  "statusCode": 400,
  "timestamp": "2026-08-31T21:30:30.873Z",
  "path": "/api/projects/:id/artifacts",
  "message": "..." ,
  "errorCode": "BAD_REQUEST"
}
```
`message` puede ser un string simple (excepciones manuales, ej. `NotFoundException('...')`) o un array estructurado `{ campo, mensaje }[]` cuando el error viene de una validación (ver punto 2).

**Alternativa descartada:** un envoltorio anidado `{ error: { message, detalles } }`. Se encontró que dos archivos del frontend (`api-client.ts`, `artifacts.api.ts`) ya asumían esa forma en sus comentarios, pero ningún `ResponseInterceptor` real la producía (confirmado con `grep -rn "ResponseInterceptor" apps/backend/src` sin resultados, y con una prueba real de `curl` que devolvió el objeto plano). Un tercer archivo, `card-sorting.api.ts`, ya funcionaba en producción esperando `body.message` plano. Se estandarizó en el formato plano porque era el que menos archivos rompía.

**Mecanismo:** `GlobalExceptionFilter` (`apps/backend/src/common/filters/global-exception.filter.ts`), registrado con `app.useGlobalFilters(...)` en `main.ts`. Usa `@Catch()` (sin tipo) para interceptar cualquier excepción, no solo `HttpException`. Mapea además `Prisma.PrismaClientKnownRequestError` (`P2025` → 404, `P2002` → 409) para que errores de Prisma no controlados no lleguen como 500 crudo al cliente — este es justo el tipo de error que causó el bloqueo de infraestructura de este sprint (ver corrección post-auditoría más abajo).

### 2. Errores de validación estructurados por campo

**Qué es:** los 400 de validación devuelven `message` como `{ campo, mensaje }[]` en vez de texto genérico, para que los formularios de Persona/Journey Map/Momentos Críticos puedan resaltar el input exacto que falló.

**Dos fuentes distintas de validación, dos mecanismos:**
- **`ValidationPipe` (forma del DTO)** — valida que el body tenga la forma general (`tipo`, `contenido` presentes, etc.), vía `class-validator`. Se le agregó un `exceptionFactory` custom en `main.ts` que aplana los `ValidationError` (incluyendo anidados, ej. `contenido.hobbies.0`) a `{campo, mensaje}[]`.
- **Validación Zod del contenido (`validateContenidoByTipo` en `artifacts.service.ts`)** — valida la forma específica de cada `PersonaSchema`/`JourneyMapSchema`/`MomentosCriticosSchema`. Esta validación ya armaba el array `{campo, mensaje}[]` correctamente (bajo la llave `errores`), pero el `GlobalExceptionFilter` no lo leía — ver corrección post-auditoría.

**Trade-off aceptado:** el fallback (`campo: ''`) cubre el caso de un `400` lanzado a mano con un string simple (`throw new BadRequestException('mensaje suelto')`, sin pasar por ninguno de los dos mecanismos anteriores) — ahí no hay campo que aislar, porque el propio `throw` manual nunca tuvo esa información.

**Corrección post-auditoría (bug encontrado y cerrado en este mismo sprint):** la primera versión del `GlobalExceptionFilter` solo leía `exception.getResponse().message`. Las excepciones de `artifacts.service.ts` arman `{ message: 'texto genérico', errores: [{campo,mensaje}] }` — el array bueno vivía en `errores`, no en `message`, así que se perdía y el frontend solo recibía el string genérico. Se corrigió priorizando `res.errores` sobre `res.message` cuando el primero existe. Verificado con `curl` real: `POST /projects/:id/artifacts` con `{"nombreCompleto":123}` ahora devuelve `"message":[{"campo":"nombreCompleto","mensaje":"Invalid input: expected string, received number"}]`.

### 3. Sistema de toasts (frontend, costo cero)

**Qué es:** `apps/frontend/src/shared/api/toast.ts` expone `notify.error/success/info(mensaje)`, que emiten un `CustomEvent('app:toast')` sobre `window`. `apps/frontend/src/shared/components/ToastContainer.tsx` escucha ese evento, apila avisos, auto-descarta a los 5s, respeta `prefers-reduced-motion`. Se montó una sola vez en `main.tsx`, como hermano del árbol de `<App />` dentro de `<BrowserRouter>`.

**Por qué se decidió así:** cero dependencias nuevas (nada de librerías de toast de terceros), y el patrón de evento global permite que cualquier capa (interceptor HTTP, un componente suelto) dispare un aviso sin acoplarse a dónde vive el `ToastContainer` en el árbol.

### 4. `main.tsx` estaba vacío

**Qué se encontró:** al integrar el `ToastContainer`, se detectó que `apps/frontend/src/main.tsx` tenía 0 bytes — nunca existió un punto de entrada real con `createRoot`, providers ni `<App />` montado. No es una regresión de este sprint; se desconoce si el archivo se vació en algún punto anterior del proyecto o nunca se llenó tras el scaffold inicial de Vite.

**Reconstruido con:** `StrictMode` → `QueryClientProvider` (instancia única de TanStack Query) → `BrowserRouter` → `<App />` + `<ToastContainer />` como hermano.

**Pendiente para el equipo:** confirmar que `App.tsx` sí tiene contenido real (no se verificó en este sprint, solo se asumió su existencia porque `main.tsx` lo importa). Si también está vacío o incompleto, el build fallará hasta llenarlo.

### 5. Pendiente real, no cerrado en este sprint

- `ErrorBoundary.tsx` y `NotFound.tsx` se generaron como componentes standalone, pero no se confirmó que estén efectivamente envolviendo las features (`<ErrorBoundary><PersonaFeature /></ErrorBoundary>`) ni que la ruta comodín (`<Route path="*" element={<NotFound />} />`) esté agregada al router real — quedó como instrucción, no como cambio verificado en archivo.
- El fallback de campo vacío (punto 2) sigue abierto para cualquier `throw` manual futuro que no pase por `ValidationPipe` ni por la validación Zod del service.

**⚠️ Conflicto de arquitectura sin resolver (crítico, bloquea merge):** `main.tsx`, `NotFound.tsx` y `ErrorBoundary.tsx` de este sprint asumen `react-router-dom` (`BrowserRouter`, `<Link>`). Una sesión de trabajo distinta, en paralelo, tomó la decisión deliberada de **no** agregar `react-router-dom` y usar routing por `location.hash` en su lugar (`useHashRoute.ts`), específicamente para no sumar una dependencia nueva a mitad de sprint sin acuerdo del equipo. Ambos supuestos no pueden convivir tal cual. Detalle completo, con los archivos exactos de cada lado, en `docs/SESION-CLAUDE-sprint3.md §8.1` y `§9.1` — resolver ahí antes de fusionar cualquier rama que toque `main.tsx`, `App.tsx` o el router.
---

## Sprint 3 (continuación) — Cierre del conflicto de routing (C4) + frontend funcional end-to-end

**Resolución de C4:** al retomar el proyecto en una sesión posterior, `main.tsx` y `App.tsx` ya reflejaban la decisión a favor de `react-router-dom` (`BrowserRouter`, no `useHashRoute`) — la reconstrucción de `§9.2` del log de sesión había prevalecido. Se cerró la brecha real que quedaba abierta: la dependencia nunca se había agregado a `package.json` pese a que el código ya la importaba. Agregada (`react-router-dom@7.18.3`) y construido `App.tsx` con rutas anidadas: `/login` pública, resto protegido por `ProtectedRoute` (redirige si no hay `evaluadorToken`), `/proyectos/:proyectoId` como layout con sub-navegación a cada técnica UX (Personas, Journey Map, Momentos Críticos, Card Sorting, Evaluación Heurística).

**Auth de evaluador implementada:** cerrando el placeholder que `§7.3` de `SESION-CLAUDE-sprint3.md` dejaba pendiente para "Sprint 4", se construyó `features/auth/` (api + store Zustand + página de login) contra `POST /api/auth/login` real. El store escribe en la misma llave `localStorage.getItem('evaluadorToken')` que `shared/api/artifacts.api.ts` ya leía como TODO — sin necesidad de tocar ese archivo.

**Páginas conectadas a los hooks ya existentes:** las páginas de Persona, Journey Map y Momentos Críticos consumen directamente los hooks de TanStack Query que ya existían (`usePersonaQueries.ts`, etc., escritos en la sesión de `§4`) — no se tocó esa capa, solo se construyó la UI encima. Card Sorting (evaluador crea el estudio maestro) usa `useCardSortingQueries.ts` ya existente. Evaluación Heurística no tenía capa `api/`/`hooks/` todavía (solo `.gitkeep`) — se construyó siguiendo el mismo patrón que el resto de las features, contra las rutas documentadas en `docs/BACKEND.md §Evaluación heurística`.

**Nota de fricción a resolver por el equipo:** `HallazgoHeuristica` (forma del payload que espera `PATCH .../hallazgos`) se construyó por inferencia razonable (nombre del método `registrarHallazgo`, las 10 heurísticas de Nielsen), sin haber visto el DTO real del backend (`apps/backend/src/modules/sessions/evaluacion-heuristica/dto/heuristica.dto.ts` no se inspeccionó en esta sesión). Si el backend rechaza el POST con 400, ese es el primer archivo a revisar.

---

## Sprint 4 — Edición de artefactos (Persona / Journey Map / Momentos Críticos), matriz de priorización y auditoría de UX

**Qué se agregó:** las tres páginas conectadas en el sprint anterior (Persona, Journey Map, Momentos Críticos) solo permitían crear y eliminar. Se agregó edición in-place: cada página guarda `editandoId` en estado local, precarga el `form` con el `contenido` del artefacto seleccionado (`handleIniciarEditar`/`handleStartEdit`) y en `handleSubmit` decide entre `crear(...)` o `actualizar({artefactoId, contenido}, ...)`. Momentos Críticos además suma una vista de matriz 3×3 (impacto × frecuencia) que agrupa client-side los incidentes de `listCriticalMoments` sin pegarle a ningún endpoint nuevo.

### Bug crítico encontrado y corregido: `createArtifactVersion` apuntaba a un endpoint inexistente

**Qué se encontró (auditoría):** la función `updatePersona`/`updateJourney`/`updateCriticalMoment` llamaba a `createArtifactVersion(proyectoId, artefactoLogicoId, tipo, contenido)`, que hacía:
```
POST /projects/:proyectoId/artifacts?artefactoLogicoId=...
body: { tipo, contenido }
```
Ese endpoint **no existe**. `ArtifactsController` solo expone `POST /projects/:proyectoId/artifacts` (crear, ignora query params, espera `artefactoLogicoId` en el **body**) y `POST /projects/:proyectoId/artifacts/:artefactoId/versions` (versionar, espera solo `{ contenido }`). Como la llamada real caía en el endpoint de *crear* sin `artefactoLogicoId` en el body, `ArtifactsService.create` generaba un `randomUUID()` nuevo cada vez (`artefactoLogicoId: dto.artefactoLogicoId?.trim() || randomUUID()`) — **"editar" creaba un artefacto lógico duplicado en vez de versionar el existente**, y el listado (ya deduplicado por `dedupeLatestVersions`) mostraba dos entradas donde debía haber una actualizada.

**Severidad:** Alta — rompía silenciosamente la función que se acababa de construir en las 3 features (Persona, etapas de Journey Map, incidentes de Momentos Críticos), sin ningún error visible porque tampoco había manejo de errores en esas páginas (ver siguiente punto).

**Cerrado:** `createArtifactVersion` vuelve a apuntar a `POST /projects/:proyectoId/artifacts/:artefactoId/versions` con body `{ contenido }` únicamente (`apps/frontend/src/shared/api/artifacts.api.ts`). Se actualizaron los 3 wrappers (`persona.api.ts`, `journey-map.api.ts`, `momentos-criticos.api.ts`) para no mandar `tipo` en la actualización. Se eliminó también `updateArtifact` (función muerta agregada en el mismo cambio, sin uso en ningún componente, que pegaba a un `PUT /artifacts/:id` que tampoco existe en el controller). Verificado con `npx tsc --noEmit` y `npx vite build` sin errores.

### Gap encontrado y corregido: errores invisibles en Persona / Journey Map / Momentos Críticos

**Qué se encontró:** a diferencia de `CardSortingPage.tsx` (que sí muestra `{error && <p>...}`), las 3 páginas de este sprint solo renderizaban `isLoading`. `shared/api/artifacts.api.ts` sí lanza `ArtifactsApiError` con mensaje legible en cada fallo (400 con detalle por campo, u "Error HTTP 500"), pero como ninguna página desestructuraba `error` de `useQuery`/`useMutation`, ese error quedaba solo en la consola — el usuario no se enteraba de que su "Guardar" había fallado.

**Cerrado:** las 3 páginas ahora desestructuran `error` (de la query de listado y de las 3 mutaciones: crear/actualizar/eliminar) y lo muestran con el mismo patrón que `CardSortingPage.tsx` (`<p style={{ color: 'var(--coral)' }}>...</p>`), distinguiendo si el fallo fue al cargar el listado o al guardar.

### Gap encontrado y corregido: layout no responsive (mobile roto)

**Qué se encontró:** `.app { grid-template-columns: 254px 1fr; }` en `theme.css`, sin ningún `@media`. En un viewport de ~375–414px el sidebar fijo dejaba ~120–160px para todo el contenido — inutilizable en las 5 features, no solo en las 3 de este sprint. Los formularios de Persona/Journey Map/Momentos Críticos además usaban `gridTemplateColumns: '1fr 1fr'`/`'1fr 1fr 1fr'` inline, sin forma de colapsar a 1 columna.

**Cerrado:** se agregó un breakpoint `@media (max-width: 768px)` en `theme.css` que: colapsa `.app` a una columna, convierte el sidebar (`.side`) de columna fija a barra horizontal con scroll (nav + usuario en línea), reduce paddings de `.top`/`.content`, y pasa `.metrics` a 2 columnas. Se extrajeron los grids inline de los 3 formularios a clases reutilizables `.form-grid-2`/`.form-grid-3`, que el mismo breakpoint colapsa a 1 columna. La matriz de Momentos Críticos (`minWidth: 600` + `overflowX: auto`) se dejó igual — ya resuelve mobile con scroll horizontal, el problema real era el layout padre.

**Pendiente real, no cerrado en este sprint:** no se tocaron los grids inline de `ProjectsPage.tsx`/`DashboardPage.tsx` (tarjetas de proyecto) ni el resto de estilos inline de las 5 páginas — quedan angostos en mobile aunque ya no compiten con un sidebar de 254px. Los tests del backend (`softDelete` en `artifacts.service.spec.ts`, ver auditoría previa) tampoco se recuperaron en esta sesión — siguen sin cobertura en `main`.

### Cabo suelto cerrado: crear/quitar etapas de Journey Map

**Qué se encontró:** `useJourneyMapQueries.ts` tenía tres hooks (`useCreateStage`, `useUpdateStage`, `useDeleteStage`) que nunca se usaban desde `JourneyMapPage.tsx`. Cada uno persistía una sola etapa contra el backend de inmediato (vía `updateJourney`), un diseño que no era compatible con el resto de la página: (a) requerían un `artefactoId` ya existente, así que no podían usarse mientras se crea un Journey Map nuevo (todavía sin persistir), y (b) el resto del formulario (nombre, rol, cada campo de cada etapa) edita `form` en memoria y solo persiste todo junto al enviar — mezclar un guardado inmediato por etapa con el resto del form en borrador habría generado inconsistencias (ej. agregar una etapa quedaría guardada aunque el usuario cancele el formulario sin enviar el resto de los cambios).

**Gap real que dejaba:** no había ningún botón para agregar o quitar una etapa — el usuario solo podía editar el texto de las 3 etapas con las que arranca `contenidoVacio()`. El helper puro `removePhase` tampoco aplicaba su propia regla de mínimo 3 etapas (esa validación vivía solo en el hook huérfano `useDeleteStage`, nunca ejecutada).

**Cerrado:** se eliminaron los 3 hooks huérfanos de `useJourneyMapQueries.ts` (y sus imports no usados de `addPhase`/`replacePhase`/`removePhase`/`Phase`). En `JourneyMapPage.tsx` se agregaron `handleAgregarFase` (usa el helper puro `addPhase` sobre `form`, en memoria) y `handleQuitarFase` (usa `removePhase`, respeta el mínimo de 3 etapas con `disabled` en el botón), consistente con el patrón de "editar en memoria, persistir todo junto al enviar" que ya usan Persona y Momentos Críticos. Botón "+ Agregar etapa" al final de la lista y "Quitar etapa" (deshabilitado bajo el mínimo) en cada card. Verificado con `npx tsc --noEmit` y `npx vite build` sin errores; confirmado que no quedan referencias a los hooks eliminados (`grep -r useCreateStage/useUpdateStage/useDeleteStage` sin resultados).

### Gap encontrado y corregido: bloqueo pesimista sin conectar a la UI (F1)

**Qué se encontró (auditoría contra el Flujo de Usuario maestro):** el mecanismo de lock estaba completo en el backend (`acquireLock`/`releaseLock`, §Sprint 2.3) y en la capa de hooks del frontend (`useLockPersona`/`useUnlockPersona` y sus equivalentes en `journey-map`/`momentos-criticos` — ya nombrados así, ya funcionales), pero ninguna de las 3 páginas los llamaba. Confirmado con `grep` de `acquireLock`/`lockX`/`setLocked` sobre `PersonasPage.tsx`, `JourneyMapPage.tsx` y `MomentosCriticosPage.tsx`: cero resultados. En la práctica, dos estudiantes podían editar el mismo artefacto en simultáneo y el segundo guardado sobrescribía al primero sin ningún aviso — justo el escenario que el TTL pesimista fue diseñado para prevenir (§Sprint 2.3).

**Cerrado:** las 3 páginas ahora integran el ciclo completo:
- Al iniciar edición (`handleIniciarEditar`/`handleStartEdit`), se llama `lockX.mutate({ artefactoId })`.
- Si el backend responde `409` (lock vigente de otro usuario), se dispara `notify.error(...)` con un mensaje explícito y el formulario queda en solo lectura (`<fieldset disabled>` envolviendo los campos), sin bloquear la lectura del contenido.
- Al cancelar (`resetForm`) o al guardar con éxito (`onSuccess` de la mutación de actualizar), se llama `unlockX.mutate(artefactoId)`.

**Trade-off aceptado:** no se agregó `unlock` en un `useEffect` de desmontaje — si el usuario navega fuera de la página a mitad de una edición sin cancelar ni guardar, el lock queda tomado hasta que expire el TTL (5 min default). Se decidió no complicar el ciclo de vida del componente para ese caso, apoyándose en el TTL como la red de seguridad que ya estaba diseñada para eso (§Sprint 2.3). Detalle completo en `docs/AUDIT_LOG.md` (F1) y `docs/CAMBIOS.md §Ronda 4`.

---

## Sprint 5 — Robustez del lock pesimista + acceso multi-usuario mínimo

Foco del sprint: cerrar los cabos sueltos que dejó F1 (Sprint 4) al conectar el lock a la UI, y resolver el problema de fondo de que el modelo de acceso a proyectos solo soportaba un usuario por proyecto — lo que impedía probar el lock entre usuarios reales distintos.

### Doble unlock, condición de carrera en `acquireLock`, y `softDelete` inconsistente

Al conectar el lock a la UI en el sprint anterior, `onSuccess` de la mutación de actualizar llamaba `unlockX(idAEditar)` y luego `resetForm()` volvía a llamar `unlockX(editandoId)` — dos releases por guardado. Se corrigió dejando `resetForm()` como única fuente de verdad para desbloquear.

Más de fondo: `acquireLock()` en `artifacts.service.ts` hacía "chequear (`assertNotLockedByOther`) y luego actualizar" en dos pasos separados. Bajo concurrencia real (exactamente el escenario que ahora se puede probar con 3 cuentas reales, ver abajo), dos requests podían pasar ambos el chequeo antes de que cualquiera escribiera, y ambos terminar creyendo que tienen el lock. Se reemplazó por un `updateMany` condicional atómico: la condición de "lock libre o propio" y la escritura del nuevo lock ocurren en la misma sentencia SQL (`WHERE id = latest.id AND (lockedUntil < now OR lockedById = user.id OR lockedById IS NULL)`), verificando `result.count` — si es 0, se lanza `409`.

`softDelete()` tenía la misma clase de bug que ya se había cerrado en `createVersion`/`acquireLock` (Sprint 2.3): chequeaba el lock contra la fila que llegó en la URL, no contra la última versión del artefacto lógico. Se alineó al mismo patrón (`getLatestVersion()` antes de `assertNotLockedByOther`).

Detalle en `docs/AUDIT_LOG.md` (F2, F3, F4).

### Modelo de acceso a proyectos: de "un solo dueño" a `ProyectoMiembro`

**Qué se encontró:** `assertProjectAccess` en `artifacts.service.ts` solo reconocía al creador del proyecto (`Proyecto.creadoPorId`) o a un usuario `ADMIN`. El seed traía una sola cuenta de prueba (`evaluador@ux.utem.cl`) — con una sola cuenta, nunca se pudo ejercitar realmente el lock pesimista entre dos usuarios distintos, solo simularlo.

**Decisión:** en vez de agregar un parche temporal (dar rol `ADMIN` a cuentas de prueba, lo que hubiera bypaseado el control de acceso real para todos los proyectos, no solo el de prueba), se adelantó el modelo de datos que de todas formas hacía falta para colaboración multi-usuario: una tabla `ProyectoMiembro` (`proyectoId`, `usuarioId`, `@@unique([proyectoId, usuarioId])`). `assertProjectAccess` ahora acepta: creador, `ADMIN`, o miembro.

**Migración:** `20260904000000_add_proyecto_miembro` crea la tabla y hace backfill — cada proyecto ya existente inserta a su `creadoPorId` como miembro, así ningún proyecto ya creado pierde acceso al migrar.

**Seed:** las 3 cuentas de estudiante (`estudiante1/2/3@ux.utem.cl`) quedan todas como `ProyectoMiembro` del mismo proyecto demo (una de ellas, además, `creadoPorId`) — ahora sí se puede loguear con 2 cuentas distintas, editar artefactos en paralelo, y provocar a propósito el `409` del lock sobre el mismo artefacto.

**Alcance acotado a propósito, pendiente para una Fase 2 completa más adelante:**
- No se agregaron endpoints (`POST/GET/DELETE .../miembros`) para gestionar la membresía vía API, ni pantalla de UI para eso — por ahora la membresía solo se puede poblar desde el seed o directo en base de datos.
- `ProjectsService`, `CardSortingService` y `EvaluacionHeuristicaService` siguen con su propio chequeo de acceso por `creadoPorId` — no se tocaron, así que solo el módulo de Artefactos UX (Persona/Journey Map/Momentos Críticos) reconoce a los miembros nuevos por ahora.

Detalle en `docs/AUDIT_LOG.md` (F5) y `docs/CAMBIOS.md` (§Ronda 5).

---

## Sprint 6 — Acceso a proyectos consolidado + gestión de miembros (Fase 2, backend)

Foco: cerrar los dos "pendiente acotado" que dejó el Sprint 5 (F5) — el modelo `ProyectoMiembro` existía pero (a) `ProjectsService`/`CardSortingService`/`EvaluacionHeuristicaService` no lo reconocían, cada uno con su propio chequeo `creadoPorId`/ADMIN duplicado, y (b) no había forma de gestionar la membresía salvo por seed o base de datos directa.

### De 4 chequeos duplicados a un servicio compartido

**Qué se encontró:** el chequeo "dueño, ADMIN, o miembro" vivía completo solo dentro de `ArtifactsService` (método privado `assertProjectAccess`, agregado en F5). Los otros tres servicios con acceso a proyecto (`ProjectsService.findOne`, `CardSortingService.createSession`, `EvaluacionHeuristicaService.crearSesion`/`obtenerAnalitica`) seguían con la versión vieja, sin `ProyectoMiembro`: un estudiante agregado como miembro podía ver/editar artefactos (Persona, Journey Map, Momentos Críticos) pero no podía crear un estudio de Card Sorting ni una Evaluación Heurística en ese mismo proyecto — inconsistencia directa con el propósito del modelo `ProyectoMiembro`.

**Cerrado:** extraído a `ProjectAccessService` (`core/access/project-access.service.ts`), registrado en un módulo `@Global` (`core/access/project-access.module.ts`) para no requerir imports explícitos en cada módulo feature. Expone `assertAccess` (dueño/ADMIN/miembro — uso normal) y `assertOwnerOrAdmin` (dueño/ADMIN únicamente — operaciones administrativas, como gestionar membresía). Los 4 call-sites duplicados fueron reemplazados por llamadas a este servicio; el método privado de `ArtifactsService` fue eliminado.

**Trade-off aceptado en `ProjectsService.findOne`:** antes hacía un solo `prisma.proyecto.findUnique` (con `_count` incluido) y chequeaba `creadoPorId` sobre el resultado. Ahora hace ese `findUnique` *más* el que hace `assertAccess` internamente — dos queries a la tabla `proyectos` en vez de una. Se aceptó la duplicación en vez de complicar la firma de `assertAccess` para que acepte un proyecto ya cargado, priorizando reusar la misma lógica de acceso en los 4 lugares sobre una micro-optimización de una query extra (barata) por request.

### Gestión de miembros vía API

**Qué se agregó:** `GET/POST/DELETE /projects/:id/miembros` en `ProjectsController`/`ProjectsService`.
- `GET`: lista miembros con datos básicos del usuario (`id`, `nombre`, `email`, `rol`). Requiere `assertAccess` — cualquier miembro puede ver la lista, no hace falta ser dueño.
- `POST` (`{ email }`): agrega un miembro existente por email. Requiere `assertOwnerOrAdmin` — un miembro no puede agregar a otro. Resuelve el `Usuario` por email (`404` si no existe ninguno con ese correo) y usa `upsert` sobre `@@unique([proyectoId, usuarioId])`, así que agregar dos veces al mismo usuario es idempotente, no un error.
- `DELETE /:usuarioId`: quita un miembro. Requiere `assertOwnerOrAdmin`. Si `usuarioId` coincide con `creadoPorId` del proyecto, se rechaza con `400` explícito ("No puedes quitar al creador del proyecto") — el creador no es una fila de `ProyectoMiembro`, es el dueño real, y sacarlo de la lista de miembros no tendría el efecto que alguien esperaría (seguiría teniendo acceso total igual).

**Fuera de alcance a propósito:** no hay invitación por correo ni creación de cuentas — agregar por email requiere que el `Usuario` ya exista. No se agregó UI todavía (queda para cuando se aborde el frontend de esta fase).

### Bug encontrado en los tests al hacer el refactor (G1)

Al mover el chequeo de `ArtifactsService` al servicio compartido, se revisó su spec (`artifacts.service.spec.ts`) para no romperlo — y se encontró que el mock de `prisma` nunca tuvo `proyectoMiembro`, pese a que el código real ya lo consultaba desde F5. Los 3 tests que ejercitan "usuario sin acceso" (`create`, `softDelete`, `acquireLock`, todos con `otherUser`) estaban, en la práctica, llamando a un método inexistente (`undefined.findUnique`) en vez de validar el `ForbiddenException` real que decían estar probando. Cerrado agregando `proyectoMiembro: { findUnique: jest.fn() }` al mock. Detalle en `docs/AUDIT_LOG.md` (G1).

### Verificación — parcial, limitación de entorno documentada

`npx tsc --noEmit`: sin errores propios (con la salvedad de que hay un `dist/tsconfig.tsbuildinfo` cacheado del build original que podría estar ocultando errores vía caché incremental — no se tomó como confirmación fuerte por eso).

`npx jest`: 2 de 6 suites corren y pasan completas (`projects.service.spec.ts` 12/12, `env.validation.smoke.spec.ts`). Las otras 4 (`artifacts`, `card-sorting`, `evaluacion-heuristica`, `auth`) no llegan a ejecutar: fallan en tiempo de tipos porque el `@prisma/client` instalado en el entorno de trabajo usado para este sprint es un placeholder sin los enums reales del schema (`TipoArtefacto`, `ActorSesion`, `EstadoSesion`, `TipoSesion`). `prisma generate` no pudo completar ahí porque `binaries.prisma.sh` no tenía salida a internet en ese sandbox (`403 Forbidden`, probado con `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`, `--no-engine`, y engine type `wasm`). Confirmado que es una limitación del entorno, no del código: los imports que fallan son líneas preexistentes, no tocadas en este sprint. **Pendiente real:** correr `pnpm prisma generate` + `pnpm test` en un entorno con red real (o Docker) para confirmar esas 4 suites.

**Pendiente real, no cerrado en este sprint:**
- Frontend: pantalla "Miembros del proyecto" (agregar por email) — el backend está listo para consumir, falta la UI en `ProjectDetailLayout.tsx` y el cliente API correspondiente.
- Sin tests nuevos para `listMembers`/`addMember`/`removeMember` — se acordó backend primero, tests de frontend en fase aparte.

---

## Sprint 7 — Fase 1: sesión expirada, ConfirmDialog, múltiples incidentes

*(Documentado retroactivamente en el Sprint 8 — este trabajo se hizo en una sesión anterior que no se volcó a la documentación en su momento.)*

Foco: los 3 ítems de "UX y robustez de sesión" del plan original de Fase 1, sin tocar el modelo de datos ni el backend.

**Sesión expirada (401):** se evaluó primero la opción del plan original — un `CustomEvent` global más un listener nuevo en `App.tsx` para forzar el redirect a `/login` — y se descartó por innecesaria: `ProtectedRoute.tsx` ya estaba suscrito a `isAuthenticated` vía `useAuthStore` (hook de Zustand), así que alcanza con que `request()` en `artifacts.api.ts` llame `useAuthStore.getState().logout()` en cualquier `401` — el cambio de estado por sí solo dispara un re-render de `ProtectedRoute`, que redirige. Un ejemplo de que vale la pena releer el código real antes de construir la infraestructura que el plan original asumía necesaria.

**`window.confirm()` → `ConfirmDialog`:** en vez de threadear estado de "¿hay un confirm pendiente?" a través de cada página, se replicó el mismo patrón arquitectónico que ya existía para los toasts (`shared/api/toast.ts` + `ToastContainer.tsx`): un módulo con una función imperativa (`askConfirm`) que dispara un `CustomEvent`, y un único componente (`ConfirmDialog`) montado en la raíz de la app que escucha, dibuja el modal, y responde con otro evento. Esto mantiene a las páginas simples (`if (await confirm('...')) { ... }`) sin necesitar Context ni prop drilling.

**Momentos Críticos, múltiples incidentes:** ver `docs/AUDIT_LOG.md` (H1). El hallazgo interesante acá no es el bug en sí, sino el patrón: es la segunda vez (después de F1 en Sprint 4) que se encuentra funcionalidad ya construida en la capa de datos/lógica (ahí, los hooks de lock; acá, `addIncidente`/`removeIncidente`) que nunca llegó a conectarse a la UI. Vale la pena, en auditorías futuras, buscar específicamente funciones exportadas sin ningún caller en el frontend.

---

## Sprint 8 — UI de miembros, Vitest, y cierre de documentación

Foco: los "pendiente real" que el Sprint 6 dejó explícitos (UI de miembros, tests de frontend), más instalar Vitest desde cero (no existía), más ponerse al día con la documentación de la Fase 1 (Sprint 7, arriba).

### UI "Miembros del proyecto"

Sin sorpresas de diseño: el backend (Sprint 6) ya definía la forma exacta de los 3 endpoints, así que el trabajo fue directo — cliente API + hooks react-query (mismo patrón que el resto de `useProjectsQueries.ts`) + una página nueva. La única decisión real fue **dónde** ocultar los controles de administración: se comparan `useAuthStore().user.id`/`.rol` contra `proyecto.creadoPorId` en el cliente, para no mostrar un formulario de "agregar miembro" o un botón "Quitar" que el backend igual va a rechazar con `403`. Esto es UX, no seguridad — el enforcement real sigue siendo `assertOwnerOrAdmin` en el backend; si alguien arma el request a mano igual se lo rechaza.

Se encontró de paso que `projects.api.ts` tenía su propio `request()` (no comparte código con `artifacts.api.ts`) y nunca había recibido el fix de sesión expirada (401) del Sprint 7 — se aplicó el mismo criterio ahí también, por consistencia, no porque se haya encontrado un bug reportado.

### Vitest, instalado por primera vez

El frontend no tenía ninguna infraestructura de testing. Se evaluó no meter Jest (que sí usa el backend) para no arrastrar su config de `ts-jest`/transformadores a un proyecto Vite — Vitest comparte config con Vite de forma nativa (mismo resolutor de módulos, mismo `import.meta.env`), así que fue la opción con menos fricción de configuración.

**Decisión de mockeo:** para los tests de `MomentosCriticosPage`, se mockeó el módulo de **hooks** (`useMomentosCriticosQueries.ts`) en vez del módulo de **api** (`momentos-criticos.api.ts`). Esto deja `addIncidente`/`removeIncidente` (funciones puras) corriendo con su implementación real —tal como las usa el componente— sin necesitar mockear `fetch` para las funciones que sí pegan a la red. Mockear un nivel más arriba (los hooks) es más quirúrgico que mockear `fetch` global, y evita que el test dependa de la forma exacta del JSON que devuelve el backend.

Se agregó un único `data-testid` a la matriz 3×3 (`celda-{impacto}-{frecuencia}`) exclusivamente para poder verificar agrupación desde el test — no cambia el comportamiento visual ni de accesibilidad, es un hook de testing puro.

**Verificado, no solo revisado a mano:** a diferencia de sesiones anteriores donde no fue posible instalar dependencias (ver limitación del Sprint 6), acá sí se pudo — se copió `apps/frontend` fuera del monorepo (para que `npm install` no intentara resolver el protocolo `workspace:` de paquetes hermanos) y se corrió tanto `npx vitest run` (3/3 tests pasan) como `npx tsc --noEmit` (sin errores) sobre el resultado real, no sobre una lectura manual del código. La instalación fue en una copia de trabajo — el repo real necesita su propio `pnpm install` para bajar estas devDependencies nuevas.

### Documentación

Nota agregada (no una decisión tomada): JWT en `localStorage` → cookie `httpOnly` sigue **sin analizarse en profundidad** — se dejó anotado como hueco explícito para cuando se lo aborde, no como algo evaluado y pospuesto con fundamento. El refactor de estilos inline → `theme.css` (Fase 3) tampoco se hizo en este sprint — se documenta como pendiente, no como completado.

**Pendiente real, no cerrado en este sprint:**
- Fase 3 completa (estilos, JWT→cookie httpOnly analizado de verdad, más tests de backend/frontend además de los 3 agregados acá).
- Test de integración real (Supertest o similar) para `listMembers`/`addMember`/`removeMember` — lo que hay hoy en frontend son tests de componente con los hooks mockeados, no un E2E contra el backend real.


