# Sesión — Integración Sprint 3 (Persona / Journey Map / Momentos Críticos) con Claude

Registro de lo trabajado en esta sesión de chat, para complementar
`docs/CAMBIOS.md` (rondas de otra IA sobre estos mismos archivos) y
`docs/ONBOARDING-FRONTEND.md`. No reemplaza esos documentos — los referencia
donde se cruzan.

---

## 1. Punto de partida

Tarea original: extraer un "contrato de integración frontend↔backend" para
Sprint 3 (Persona, Journey Map, Momentos Críticos), a partir de un HTML de
prototipo (`UX-Observatory-Presentacion.html`) y un repo real que no se había
inspeccionado todavía.

## 2. Descubrimiento de arquitectura (vía comandos bash que el usuario corrió y pegó)

Se auditó el repo real en varias rondas de `find`/`cat` antes de escribir
cualquier línea de código. Hallazgo clave: **no había que crear nada nuevo en
backend** — el modelo `UxArtifact` (versionado, polimórfico por `tipo`,
bloqueo pesimista) y los tres schemas Zod (`PersonaSchema`, `JourneyMapSchema`,
`MomentosCriticosSchema`) ya existían y cubrían exactamente lo que pedía
Sprint 3. Esto coincide con lo que `docs/ARCHITECTURE.md §Sprint 2.1` describe
como el pivote de diseño ("un único modelo genérico en vez de 3 schemas
separados").

Se detectó además que **los campos de los schemas Zod reales no coincidían**
con lo que el HTML de prototipo asumía (ej. `nombreCompleto` vs `nombre`,
`emocion` como enum Positiva/Neutral/Negativa vs escala 1-5, `impacto`/
`frecuencia` como enum Alto/Medio/Bajo vs numérico). **Decisión del dueño del
proyecto: los schemas Zod mandan, el HTML era solo boceto.**

## 3. Archivos escritos en esta sesión (backend)

- `apps/backend/prisma/schema.prisma` — agregado `deletedAt DateTime?` al
  modelo `UxArtifact` (soft delete, decisión del dueño: "proteger la cadena
  de evidencia del Observatorio", no hacer DELETE real).
- `apps/backend/src/modules/artifacts/artifacts.service.ts` —
  `findAll` ahora filtra `deletedAt: null` por defecto; nuevo método
  `softDelete()` que hace `updateMany` marcando `deletedAt` en **todas** las
  versiones del mismo `artefactoLogicoId` (no solo la última), para que
  ninguna quede visible en listados sin importar cuál sea "la más nueva".
- `apps/backend/src/modules/artifacts/artifacts.controller.ts` — nuevo
  `DELETE /projects/:proyectoId/artifacts/:artefactoId` → `remove()` →
  `softDelete()`. (Antes solo existía `DELETE .../lock`, que es otra cosa.)

Ver `docs/BACKEND.md §Artefactos UX` — ese doc lista las rutas del módulo
pero **no incluye todavía** el DELETE agregado en esta sesión; conviene
actualizarlo.

## 4. Archivos escritos en esta sesión (frontend)

Siguiendo el patrón de `features/card-sorting/` como plantilla:

- `apps/frontend/src/shared/api/artifacts.api.ts` — cliente HTTP genérico:
  `listArtifacts`, `dedupeLatestVersions`, `getArtifact`, `createArtifact`,
  `createArtifactVersion`, `acquireLock`, `releaseLock`, `deleteArtifact`.
- `apps/frontend/src/features/{persona,journey-map,momentos-criticos}/{api,hooks,store}`
  — 9 archivos, wrappers delgados sobre lo anterior + hooks TanStack Query
  (`usePersonas`, `useCreatePersona`, `useUpdatePersona`, `useDeletePersona`,
  `useLockPersona`, `useUnlockPersona`, y equivalentes) + stores Zustand
  (solo estado de UI: selección activa, índice activo, lock activo — nunca
  datos de servidor duplicados).

**Corrección hecha en esta misma sesión, después de leer `CAMBIOS.md` y
`ONBOARDING-FRONTEND.md` recién subidos:** `artifacts.api.ts` asumía
originalmente un envoltorio `{data, meta}` en las respuestas (copiado por
analogía de `api-client.ts`, el cliente de participante). `CAMBIOS.md`
ronda 2 confirma que ese envoltorio **no existe** — la respuesta es plana.
También asumía errores bajo `body.error.message` / `body.error.detalles`;
la forma real confirmada es `body.message` como array `[{campo, mensaje}]`
para errores de validación (aplanados por un `exceptionFactory` que esta
sesión no conocía y que aparentemente se agregó en una ronda paralela con
otra IA). **Se corrigió `request()` en esta sesión** para reflejar la forma
real: respuesta plana, `detalles` leído desde `body.message` cuando es
array.

⚠️ **Punto abierto, no verificado en esta sesión:** no se confirmó si ese
`exceptionFactory`/`global-exception.filter.ts` (mencionado en `CAMBIOS.md`
como nuevo, en `apps/backend/src/common/filters/`) ya está integrado en la
copia del repo que se estaba depurando en esta sesión, o si es un cambio de
otra rama/sesión todavía no traído. Antes de dar por buena la corrección de
arriba, correr una prueba real (`POST` con un `contenido` inválido a
propósito) y confirmar que el 400 vuelve con `message: [{campo, mensaje}]`.

## 5. Troubleshooting de arranque (esta sesión, en vivo)

Orden real de bloqueos encontrados y resueltos, para que quede el rastro:

1. `unable to get image ... dockerDesktopLinuxEngine` → Docker Desktop no
   estaba corriendo en Windows. Se resolvió abriéndolo.
2. `backend-1 is unhealthy` → logs mostraron 5 errores de TypeScript:
   `Cannot find module '@nestjs/throttler'`, `Cannot find module 'helmet'`,
   y 2 errores de tipo por el `deletedAt` recién agregado al schema (Prisma
   Client desactualizado). Los primeros dos **no fueron introducidos en esta
   sesión** — ya estaban rotos (`package.json` los declaraba pero
   `node_modules` del contenedor no los tenía). Se resolvió con:
   ```bash
   docker compose down
   docker compose run --rm backend pnpm install --frozen-lockfile
   docker compose run --rm backend npx prisma generate
   docker compose up -d --build
   ```
3. `GET /api/health` → `{"status":"ok",...}`. Backend sano.
4. Prueba de `POST /projects/:proyectoId/artifacts` con `Bearer TU_TOKEN`
   (literal, sin reemplazar) → `401` esperado, no era bug real.
5. Prueba repetida con token real interpolado → **`500 Internal server
   error`**, sin log revisado todavía. **Este es el punto donde se cortó el
   troubleshooting en vivo** — el siguiente paso pendiente, no resuelto en
   esta sesión, era correr `docker compose logs backend --tail=50` y leer el
   stack trace real. No se debe asumir causa sin ese log.

## 6. Estado al cierre de esta sesión

- Backend compila y arranca sano (post fix de dependencias + `prisma
  generate`).
- Endpoint `DELETE` de soft delete existe y compila, pero **no se probó en
  runtime** todavía (el `500` del paso 5 bloqueó la prueba antes de llegar
  ahí).
- Frontend (9 archivos de features + cliente compartido) escrito y corregido
  para la forma real de respuesta, pero **no se probó contra el backend
  corriendo** — solo se probó backend vía `curl` directo.
- Pendiente inmediato, en orden: (a) capturar y leer el log del `500`,
  (b) una vez resuelto, repetir la prueba de `POST` + `GET` con `curl`,
  (c) recién ahí probar el frontend nuevo contra el backend real.

## 7. Decisiones del dueño del proyecto registradas en esta sesión (no reabrir sin pedirlo)

1. Schemas Zod existentes mandan sobre el HTML de prototipo.
2. Borrado = soft delete (`deletedAt`), no DELETE real.
3. Auth de evaluador queda pendiente para Sprint 4; mientras tanto,
   `localStorage.getItem('evaluadorToken')` es el placeholder aceptado
   — y **coincide exactamente** con lo que `ONBOARDING-FRONTEND.md §2`
   describe como el patrón ya usado por el resto de los clientes HTTP del
   frontend, así que no hace falta cambiarlo.

---

## 8. Sesión — Shell de la app: routing, layout y sidebar/topbar (esta sesión, con Claude)

Sesión de chat distinta a la de las secciones 1–7 (no vi ese registro hasta
que se subió acá). Punto de partida: `App.tsx`/`main.tsx` del frontend
seguían vacíos, y el equipo va a separarse en dos ramas esta semana (una
persona en visual/frontend, el dueño de esta sesión en backend) — el
objetivo era dejar el esqueleto de la app (no las features de Sprint 3)
listo para que quien tome la parte visual no arranque de cero.

Se partió de `UX-Observatory-Presentacion.html` (el mismo mockup mencionado
en la sección 2 de este documento) como referencia de diseño ya validado —
no se rediseñó nada, se portó tal cual.

### 8.1 Archivos escritos en esta sesión

- `apps/frontend/src/styles/design-system.css` — CSS completo extraído
  del `<style>` del mockup (~32KB), sin modificar. Incluye el sistema de
  tokens (`:root` con `--navy`, `--teal`, `--mint`, etc.) y todas las
  clases de layout/componentes visuales del mockup.
- `apps/frontend/src/routes/useHashRoute.ts` — routing por
  `location.hash`, mismo patrón que ya usaba el mockup. **Decisión
  deliberada: no se agregó `react-router-dom`** (no estaba en
  `package.json`) para no meter una dependencia nueva a mitad de sprint
  sin acuerdo del equipo. Si más adelante hace falta routing anidado o
  params dinámicos, ahí sí conviene evaluarlo.
- `apps/frontend/src/features/auth/store/useSessionStore.ts` — store
  Zustand con el perfil del Usuario autenticado (`id`, `email`, `nombre`,
  `rol`) para pintar sidebar/topbar. **No incluye lógica de fetch de
  login todavía**, solo el estado.
- `apps/frontend/src/layouts/Sidebar.tsx` y `Topbar.tsx` — portados del
  mockup (`.side`/`.top`), consumen `useSessionStore` y `useHashRoute`.

**No se llegó a escribir** `AppLayout.tsx`, `App.tsx`, `main.tsx`, ni las
páginas (`DashboardPage`, etc.) — la sesión se interrumpió antes. Tampoco
se llegó a instalar/probar nada (`pnpm dev` no se corrió sobre estos
archivos en esta sesión).

### 8.2 ⚠️ Conflicto detectado con la sección 7.3 — sin resolver

`useSessionStore.ts` se escribió asumiendo que la sesión de Usuario viaja
por **cookie httpOnly** (`credentials: 'include'`), tomando como referencia
los comentarios de `card-sorting.api.ts` ("requiere sesión autenticada
(cookie de Usuario)"). Esta sesión **no tenía visibilidad** de la sección 7.3
de este mismo documento, que registra que el patrón ya decidido es
`localStorage.getItem('evaluadorToken')`, igual que el resto de los
clientes HTTP del frontend.

Son dos supuestos de transporte de sesión incompatibles entre sí. Antes de
fusionar ramas, alguien con el contexto completo (ambas sesiones) tiene que:
1. Confirmar cuál de los dos patrones es el real (revisar
   `auth.service.ts`/`auth.controller.ts` — ¿el login setea cookie, devuelve
   token en el body, o ambos?).
2. Si es `localStorage`, ajustar `useSessionStore.ts` para leer/guardar el
   token igual que ya lo hacen los clientes de `features/{persona,
   journey-map,momentos-criticos}` (según se corrigió en la sección 4).
3. Si el layout (`Sidebar`/`Topbar`) necesita el token para algo más que
   pintar el nombre, ese es el momento de decidir si vive en
   `useSessionStore` o si ese store debe consumir el mismo mecanismo que
   ya usan los otros stores de esta sesión previa.

No se debe asumir cuál gana sin revisar el código real de auth — este
documento por sí solo no lo resuelve, solo dos decisiones registradas en
sesiones distintas que no se hablaron entre sí.

### 8.3 Sin colisión de archivos (verificado)

Se crearon carpetas vacías `features/{persona,journey-map,
momentos-criticos}/{api,hooks,store}` como parte del andamiaje, pero
**no se escribió contenido en ellas** antes de que la sesión se
interrumpiera. No hay colisión con los 9 archivos que la sección 4 de
este documento describe como ya escritos ahí — esos 9 archivos deben
ganar tal cual al fusionar ramas; las carpetas vacías de esta sesión no
aportan nada y se pueden descartar.

### 8.4 Pendiente inmediato (esta sesión)

1. Resolver el conflicto de 8.2 antes de seguir.
2. Escribir `AppLayout.tsx` (envuelve Sidebar + Topbar + contenido),
   `App.tsx` (login vs. shell autenticado, según `useSessionStore`) y
   `main.tsx` (bootstrap + `QueryClientProvider`).
3. Páginas stub para `dashboard`/`heuristic`/`sorting` (ya existe base de
   Card Sorting en `features/card-sorting/`, falta la página que la
   consuma) — las de `persona`/`journey`/`moments` ya tienen su capa de
   datos (sección 4), solo faltaría la página que llame a esos hooks.
4. Recién ahí, correr `pnpm --filter frontend dev` contra el backend real
   y verificar en el navegador — nada de esto se probó en runtime todavía.

---

## 9. Sesión — Sistema de manejo de errores (backend + frontend), esta sesión, con Claude

Tercera sesión de chat distinta a las secciones 1–8 (no tuve visibilidad de
ninguna de las dos hasta que se subió este documento al final). Punto de
partida: un pedido explícito de construir manejo de errores nativo y de
costo cero para NestJS + React, sin conocer todavía la existencia de las
secciones 1–8.

### 9.1 ⚠️ CONFLICTO REAL DETECTADO — estrategia de routing incompatible con 8.1

La sección 8.1 registra una **decisión deliberada**: no agregar
`react-router-dom` como dependencia nueva a mitad de sprint, y en su lugar
usar `useHashRoute.ts` (routing por `location.hash`).

Esta sesión **no tenía esa información** y asumió lo contrario: se
construyeron `NotFound.tsx` (usa `<Link>` de `react-router-dom`) y,
después, `main.tsx` completo con `<BrowserRouter>` de `react-router-dom`
envolviendo `<App />` — precisamente la dependencia que 8.1 decidió no
agregar.

**Contexto de por qué pasó:** en esta sesión, `main.tsx` se encontró vacío
(0 bytes, mismo hallazgo que ya registra 8.1 sobre `App.tsx`/`main.tsx`
— am**bas sesiones chocaron con el mismo archivo vacío, sin saber una de
la otra**) y, al no tener visibilidad de la decisión de 8.1, se reconstruyó
usando el patrón más común de Vite+React (`BrowserRouter`) en vez de
consultar si ya existía una decisión tomada.

**No resolver esto en automático.** Antes de fusionar cualquiera de las dos
ramas:
1. Decidir de una vez: ¿`react-router-dom` (esta sesión) o `useHashRoute`
   (sección 8)? Ambos NO pueden convivir sin reconciliar `App.tsx`
   (`AppLayout` de 8 asumía hash-routing; `<App />` de esta sesión asume
   que el router vive *fuera* de `App`, en `main.tsx`).
2. Si gana `useHashRoute`: el `main.tsx` de esta sección 9 hay que
   reescribirlo sin `BrowserRouter`, y `NotFound.tsx`/`ErrorBoundary.tsx`
   (ver 9.2) hay que revisar si `NotFound.tsx` necesita adaptarse (usa
   `<Link to="/">`, que es API de `react-router-dom`, no de hash routing
   manual).
3. Si gana `react-router-dom`: agregarlo formalmente a `package.json` (no
   estaba, según 8.1) y el `Sidebar`/`Topbar`/`useHashRoute.ts` de la
   sección 8 necesitan adaptarse al nuevo esquema.

### 9.2 Archivos escritos en esta sesión

**Backend:**
- `apps/backend/src/common/filters/global-exception.filter.ts` (nuevo) —
  `@Catch()` global, formato de error plano `{statusCode, timestamp, path,
  message, errorCode}`. Mapea `PrismaClientKnownRequestError` (P2025→404,
  P2002→409).
- `apps/backend/src/main.ts` (editado) — registro del filtro
  (`app.useGlobalFilters(...)`) + `exceptionFactory` custom en el
  `ValidationPipe` ya existente, para que los 400 de `class-validator`
  salgan como `{campo, mensaje}[]` en vez de `string[]` genérico.

**Frontend:**
- `apps/frontend/src/shared/api/toast.ts` (nuevo — no existía, aunque
  `api-client.ts` ya lo importaba). `notify.error/success/info(mensaje)`
  vía `CustomEvent('app:toast')`.
- `apps/frontend/src/shared/components/ToastContainer.tsx` (nuevo) —
  escucha el evento, apila avisos, auto-descarta a los 5s.
- `apps/frontend/src/shared/components/ErrorBoundary.tsx` y `NotFound.tsx`
  (nuevos) — ver conflicto de routing en 9.1 para `NotFound.tsx`.
- `apps/frontend/src/shared/api/api-client.ts` y `artifacts.api.ts`
  (editados) — parseo de error ajustado al formato plano del filtro nuevo.
  **Punto de fricción con la sección 4:** esta sesión editó
  `artifacts.api.ts` sobre una copia subida por tar en esta misma sesión,
  sin saber que la sección 4 (otra sesión, con otra IA) ya lo había
  corregido antes por el mismo motivo (envoltorio `{data,meta}` inexistente).
  **No se verificó si ambas ediciones parten del mismo snapshot del
  archivo** — antes de fusionar, diff manual de `artifacts.api.ts` entre
  ambas sesiones para no perder ninguna corrección.
- `apps/frontend/src/main.tsx` (reconstruido completo — ver 9.1, estaba en
  0 bytes) — `StrictMode` → `QueryClientProvider` → `BrowserRouter` →
  `<App />` + `<ToastContainer />`.

### 9.3 Bug real encontrado y cerrado en esta sesión

El `GlobalExceptionFilter` inicial solo leía `exception.getResponse().message`.
Las validaciones Zod de `artifacts.service.ts` (mencionadas en la sección 2
de este mismo documento) arman `{ message: 'texto genérico', errores:
[{campo,mensaje}] }` — el array estructurado vivía en `errores`, no en
`message`, así que se perdía en el camino y el frontend solo recibía el
string genérico. Se corrigió el filtro para priorizar `res.errores` sobre
`res.message`. **Verificado con curl real** (no solo lectura de código):
`POST /projects/:id/artifacts` con `{"nombreCompleto":123}` devolvió
`"message":[{"campo":"nombreCompleto","mensaje":"Invalid input: expected
string, received number"}]`.

También se resolvió, en la misma sesión pero como troubleshooting de
infraestructura aparte, el bloqueo que la sección 5 de este documento deja
pendiente en el paso 5 (el `500` sin log revisado): el log mostró
`P2022 — The column ux_artifacts.deletedAt does not exist`. Causa raíz:
`schema.prisma` se había editado a mano (agregar `deletedAt`, sección 3 de
este documento) y se corrió `prisma generate`, pero nunca `prisma migrate
dev` — el Cliente creía que la columna existía, Postgres no la tenía.
Resuelto con `docker compose exec backend sh -c "cd apps/backend && pnpm
exec prisma migrate dev --name add_deleted_at_to_ux_artifact"`.

### 9.4 Estado al cierre de esta sesión

- Backend: filtro + `exceptionFactory` verificados en runtime con `curl`
  real (401 con token vencido, 400 con validación Zod estructurada). El
  bloqueo del `P2022` de la sección 5 quedó resuelto también.
- Frontend: cambios de `api-client.ts`/`artifacts.api.ts`/`toast.ts`/
  `ToastContainer.tsx`/`main.tsx` escritos y entregados, **no probados en
  navegador real** — no se corrió `pnpm --filter frontend dev` ni se
  verificó visualmente que el `ToastContainer` renderice.
- `App.tsx` real **nunca se vio** en esta sesión (no se subió) — el
  `import App from './App'` en el `main.tsx` de 9.2 es un supuesto, no una
  confirmación. Si la sección 8 ya tiene un `App.tsx` en progreso (con
  `AppLayout`, `Sidebar`, `Topbar`), ese contenido no fue considerado acá.

### 9.5 Pendiente inmediato (esta sesión, en orden)

1. **Resolver 9.1 antes que cualquier otra cosa** — es la única decisión
   de arquitectura que bloquea fusionar las tres sesiones sin reescribir
   trabajo.
2. Diff manual de `artifacts.api.ts` entre esta sesión y la sección 4.
3. Confirmar contenido real de `App.tsx` (ninguna de las tres sesiones lo
   registra como visto/escrito) antes de dar por bueno el `main.tsx` de 9.2.
4. Recién ahí: `pnpm --filter frontend dev` y verificación visual del
   `ToastContainer` + un formulario real disparando un 400 estructurado.
---

## 10. Sesión — Frontend funcional end-to-end: auth, routing, y las 5 páginas de técnicas UX (esta sesión, con Claude)

Cuarta sesión de chat registrada en este documento (continúa de §1–9, con visibilidad completa de las anteriores porque se subieron al inicio). Punto de partida: un test roto (`run failed` en CI), resuelto primero; después, pedido explícito de conectar el HTML de prototipo (`UX-Observatory-Presentacion.html`) contra el backend real, "separando cada page".

### 10.1 Test roto + Prisma Client desactualizado

Ver **D1** y **D2** en `docs/AUDIT_LOG.md`. Resumen: un `sed -i` mal aplicado rompió la estructura del archivo de test; corregido a mano tras inspección línea por línea. Después, el mismo test falló por segunda causa distinta (Prisma Client desactualizado, no relacionado al `sed`) — `pnpm prisma generate` lo resolvió. 25/25 tests pasando al cierre de ese tramo.

### 10.2 Auditoría del repo antes de escribir código

Se corrieron ~6 rondas de `find`/`cat`/`grep` (mismo criterio que documenta `§2` de este archivo) antes de tocar el frontend. Hallazgos relevantes:

- `apps/frontend` **ya existía** con `features/{persona,journey-map,momentos-criticos,card-sorting}` completos (api + hooks + store, patrón consistente) — nada de eso se reescribió.
- `pages/` y `layouts/` estaban vacíos (solo `.gitkeep`) — confirmando que `§8.4` (pendiente #2 y #3) nunca se completó.
- Ver **D3** en el Audit Log: `main.tsx`/`App.tsx` ya asumían `react-router-dom`, cerrando el conflicto de `§9.1`, pero la dependencia no estaba instalada.
- No había ningún store/servicio de auth de EVALUADOR — solo el de PARTICIPANTE (`shared/api/api-client.ts`). `shared/api/artifacts.api.ts` ya tenía un TODO explícito esperando esa pieza.

### 10.3 Troubleshooting de arranque (esta sesión, en vivo — no son bugs de código, quedan acá y no en el Audit Log)

Orden real de bloqueos, del más al menos evidente:

1. `EADDRINUSE :::3000` — proceso local de `pnpm --filter backend start:dev` corriendo en paralelo al mismo backend ya levantado por una sesión de terminal anterior. Resuelto identificando el PID con `netstat -ano` y `taskkill`.
2. Igual patrón en el puerto `5174` (instancia zombie de `pnpm dev` local, con su propio `.env` vacío — leía `apps/frontend/.env`, no el `.env` raíz que sí usa `docker-compose.yml`). Causó un 404 confuso en el login que en un primer momento parecía bug de código; no lo era.
3. `PrismaClientInitializationError: Can't reach database server` → el servicio de Windows `com.docker.service` estaba `Stopped` pese a que la GUI de Docker Desktop mostraba "running". Ni reiniciar la app ni reiniciar el PC lo resolvió — hizo falta `Start-Service com.docker.service` desde PowerShell como administrador.
4. Confirmado que `docker-compose.yml` levanta los 4 servicios completos (`frontend`, `backend`, `shared-types`, `db`) — correr los `pnpm` locales en paralelo a Docker es la causa raíz de los puntos 1 y 2, no un bug de la app.
5. Ver **D4** y **D5** en el Audit Log (Vite sin `host: true`, `.env` sin `/api`).
6. Al instalar `react-router-dom` desde Windows (host) en vez de desde dentro del contenedor, `pnpm` tiró `ERR_PNPM_UNEXPECTED_STORE` al intentar instalar algo más dentro del contenedor — el store de pnpm del host y el del contenedor no coinciden. Resuelto con `docker compose exec frontend pnpm install` (reinstala todo desde el store correcto). **Nota para el equipo:** instalar dependencias nuevas del frontend siempre desde dentro del contenedor (`docker compose exec frontend pnpm --filter frontend add <paquete>`), nunca desde el host, mientras el stack corra en Docker.

### 10.4 Archivos escritos en esta sesión (frontend)

- `features/auth/{api,store,hooks,pages}` — login de evaluador contra `POST /api/auth/login`, token en `localStorage['evaluadorToken']` (misma llave que ya esperaba `artifacts.api.ts`).
- `shared/routing/ProtectedRoute.tsx` — redirige a `/login` si no hay sesión.
- `layouts/AppLayout.tsx` (sidebar + logout) y `layouts/ProjectDetailLayout.tsx` (sub-nav por técnica, vía `useOutletContext`).
- `pages/{DashboardPage,ProjectsPage,ProjectOverviewPage,PersonasPage,JourneyMapPage,MomentosCriticosPage,CardSortingPage,EvaluacionHeuristicaPage}.tsx` — las tres primeras (Persona/Journey/Momentos) consumen los hooks de `§4` sin modificarlos; Card Sorting consume los hooks ya existentes de esa feature; Evaluación Heurística requirió construir `features/evaluacion-heuristica/{api,hooks}` desde cero (ver nota de fricción en `docs/ARCHITECTURE.md`, sección de cierre de C4).
- `App.tsx` reescrito con rutas anidadas reales (ver `docs/ARCHITECTURE.md` para el detalle).

### 10.5 Estado al cierre de esta sesión

- Login end-to-end verificado en navegador real (`evaluador@ux.utem.cl` / `Demo1234!`), contra el backend real corriendo en Docker.
- Las 5 páginas de técnicas se entregaron con formularios funcionales, pero **no se verificaron una por una en runtime** dentro de esta sesión — el último paso pendiente era recargar y probar crear un registro de cada tipo.
- `EvaluacionHeuristicaPage`/`evaluacion-heuristica.api.ts` tienen el riesgo señalado arriba: forma de `HallazgoHeuristica` no confirmada contra el DTO real del backend.

### 10.6 Pendiente inmediato (esta sesión, en orden)

1. Probar en navegador: crear un proyecto → entrar → crear una Persona, un Journey Map, un Momento Crítico, un estudio de Card Sorting, y abrir + registrar un hallazgo de Evaluación Heurística.
2. Si el `PATCH .../hallazgos` falla con 400, revisar `apps/backend/src/modules/sessions/evaluacion-heuristica/dto/heuristica.dto.ts` y ajustar `HallazgoHeuristica` en el frontend.
3. Ninguna de las páginas nuevas tiene manejo de bloqueo pesimista (`lock`/`unlock`) en la UI todavía, aunque los hooks (`useLockPersona`, etc.) ya existen — quedó fuera de alcance de esta sesión, no se pidió explícitamente.