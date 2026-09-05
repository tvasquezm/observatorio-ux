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
