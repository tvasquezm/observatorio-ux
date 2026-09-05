# Cambios aplicados — kit v2 (sobre archivos reales)

Todo acá parte de TUS archivos reales que subiste, con ediciones mínimas
y quirúrgicas. No hay archivos inventados desde cero salvo los indicados.

## Ronda 8 (UI de miembros + Vitest + cierre de documentación)

Foco: terminar el "pendiente real, no cerrado" que dejó explícito el Sprint
6/Ronda 6 (frontend de miembros y tests), más la infraestructura de Vitest
que no existía en el proyecto, más documentar la Fase 1 (nunca se había
documentado — quedó pendiente entre Ronda 4 y Ronda 5).

1. **UI "Miembros del proyecto".** El backend (`GET/POST/DELETE
   /projects/:id/miembros`) ya estaba de la Ronda 6, sin tocar acá.
   - `features/projects/api/projects.api.ts`: agregadas `listMembers`,
     `addMember`, `removeMember` + tipo `MiembroProyecto`. De paso, se
     agregó el mismo manejo de sesión expirada (401 → `useAuthStore`
     `logout()` + `notify.error`) que ya tenía `artifacts.api.ts` desde la
     Fase 1 y que a este archivo se le había quedado afuera — mismo
     criterio, no una decisión nueva.
   - `features/projects/hooks/useProjectsQueries.ts`: agregados
     `useMembers`, `useAddMember`, `useRemoveMember` (mismo patrón
     react-query que el resto del archivo).
   - Nueva página `pages/ProjectMembersPage.tsx`: lista miembros
     (nombre/email/rol), formulario de alta por email, botón "Quitar" con
     `useConfirm()` (Fase 1). El formulario de alta y el botón "Quitar"
     solo se muestran si el usuario logueado es el creador del proyecto o
     ADMIN (`useAuthStore().user` vs `proyecto.creadoPorId`/`rol`) — evita
     mostrar controles que el backend igual va a rechazar con `403`; el
     creador nunca muestra botón "Quitar" (el backend ya lo rechaza con
     `400`, acá simplemente no se ofrece).
   - `layouts/ProjectDetailLayout.tsx`: tab nueva "Miembros" en `SUB_NAV`.
   - `App.tsx`: ruta `miembros` dentro de `/proyectos/:proyectoId`.

2. **Vitest — infraestructura nueva, no existía.**
   - `apps/frontend/package.json`: devDependencies
     `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
     `@testing-library/user-event`, `jsdom`; script `"test": "vitest run"`.
   - `apps/frontend/vitest.config.ts` (nuevo, separado de `vite.config.ts`
     para no mezclar config de dev server con la de test): `environment:
     'jsdom'`, `setupFiles: ['./src/test/setup.ts']`.
   - `apps/frontend/src/test/setup.ts` (nuevo): importa
     `@testing-library/jest-dom/vitest` para los matchers (`toBeDisabled`,
     etc.).
   - `apps/frontend/src/pages/__tests__/MomentosCriticosPage.test.tsx`
     (nuevo), los 3 casos de mayor riesgo que ya estaban priorizados en
     `AUDIT_LOG.md`:
     - Lock `409` → el formulario pasa a solo lectura sin romperse (F1).
     - No se puede quitar el último incidente (`MIN_INCIDENTES = 1`,
       Fase 1).
     - La matriz 3×3 agrupa cada incidente en la celda de impacto ×
       frecuencia que le corresponde, y no se cruza con otras celdas.
     Estrategia de mock: se mockea el módulo de **hooks**
     (`useMomentosCriticosQueries`), no el de `api` — `addIncidente`/
     `removeIncidente` son funciones puras y corren reales, sin necesidad
     de mockear `fetch`. Se agregó un `data-testid="celda-{impacto}-{frecuencia}"`
     a cada celda de la matriz únicamente para poder aserirlo desde el
     test (no cambia comportamiento ni accesibilidad).
   - **Verificado de verdad, no a mano:** se instaló el frontend en un
     entorno aislado (`npm install` fuera del workspace pnpm, para evitar
     que npm intente resolver el protocolo `workspace:` de otros paquetes
     del monorepo) y se corrió `npx vitest run` → **3/3 tests pasan**.
     También se corrió `npx tsc --noEmit` sobre todo el frontend → sin
     errores. Ambos se corrieron sobre una copia de trabajo, no se dejó
     `node_modules` ni lockfile de npm en el repo real — al integrar estos
     archivos hace falta `pnpm install` normal desde la raíz del
     monorepo.

3. **Documentación:**
   - `ARCHITECTURE.md`: nota corta agregada sobre "JWT en localStorage →
     cookie httpOnly" — señalada como **pendiente sin analizar en
     profundidad**, no como decisión tomada ni como trabajo hecho.
   - Esta misma ronda cierra también el resumen de Fase 3 (estilos inline
     → clases reutilizables): **sigue sin hacerse**, se documenta acá como
     pendiente explícito, no se marca como completado.
   - Se documentó retroactivamente la Fase 1 completa (ver Ronda 7 abajo),
     que se había hecho en una sesión anterior pero nunca se había
     registrado en `CAMBIOS.md`/`AUDIT_LOG.md`/`ARCHITECTURE.md`.

**Pendiente real, no cerrado en esta ronda:**
- Fase 3 completa: tests de backend/frontend adicionales fuera de los 3
  ya hechos, refactor de estilos inline → `theme.css`, y el análisis (no
  solo la nota) de JWT → cookie httpOnly.
- Sin test de integración real contra el backend (todo lo de Vitest usa
  mocks de los hooks, no `fetch` real ni Supertest) — es un test de
  componente, no un E2E.

## Ronda 7 (Fase 1 — sesión expirada, ConfirmDialog, múltiples incidentes)

Documentado retroactivamente: esta ronda se hizo en la sesión anterior a
la Ronda 8, pero no se había volcado a estos documentos todavía.

1. **Sesión expirada (401) manejada.** `shared/api/artifacts.api.ts`:
   `request()` ahora detecta `res.status === 401` → llama
   `useAuthStore.getState().logout()` + `notify.error(...)`, y lanza
   `ArtifactsApiError(401, ...)` para cortar el flujo normal de manejo de
   errores. No hizo falta un evento global ni un listener nuevo en
   `App.tsx` (a diferencia de lo que se había planeado originalmente):
   `shared/routing/ProtectedRoute.tsx` ya estaba suscrito a
   `isAuthenticated` vía `useAuthStore`, así que el `logout()` por sí solo
   dispara el redirect a `/login` en el próximo render.

2. **`window.confirm()` nativo reemplazado.** Mismo patrón de evento
   global que ya usaba `shared/api/toast.ts`:
   - `shared/api/confirm.ts` (nuevo): `askConfirm(message): Promise<boolean>`
     dispara `CustomEvent('app:confirm', ...)` con un id incremental y
     resuelve cuando llega el `CustomEvent('app:confirm-response', ...)`
     con el mismo id. `useConfirm()` es un wrapper fino que devuelve esa
     función (firma de hook pedida, sin estado propio).
   - `shared/components/ui/ConfirmDialog.tsx` (nuevo): escucha
     `app:confirm`, dibuja el modal (mismo estilo inline que
     `ToastContainer.tsx`), responde con `app:confirm-response` al hacer
     click en Confirmar/Cancelar o al apretar Escape.
   - Montado una vez en `main.tsx`, junto a `<ToastContainer />`.
   - Reemplazados los 3 `window.confirm(...)` (`PersonasPage.tsx`,
     `JourneyMapPage.tsx`, `MomentosCriticosPage.tsx`) por
     `await confirm(...)`.

3. **Momentos Críticos: múltiples incidentes por artefacto.**
   `MomentosCriticosPage.tsx` editaba solo `form.incidentes[0]` pese a que
   la matriz 3×3 y el schema (`MomentosCriticosSchema`, mínimo 1) siempre
   soportaron un array completo, y los helpers `addIncidente`/
   `removeIncidente` (en `momentos-criticos.api.ts`) existían sin uso.
   Refactor para editar `form.incidentes[]` completo, mismo patrón que
   `fases[]` en Journey Map: botón "+ Agregar incidente", botón "Quitar
   incidente" por bloque (deshabilitado si solo queda 1 —
   `MIN_INCIDENTES`), un input de "acciones sugeridas" por incidente (antes
   era un único string de estado para el incidente 0). La matriz 3×3 no se
   tocó — ya soportaba múltiples incidentes por artefacto, el problema
   estaba solo en que el formulario nunca dejaba crear más de uno.

## Ronda 6 (Fase 2 — acceso a proyectos consolidado + gestión de miembros)

Foco: cerrar el hueco que dejó F5 (Ronda 5) a propósito — `ProyectoMiembro`
existía en el modelo de datos pero (a) no había forma de gestionarlo salvo
por seed/base de datos directa, y (b) solo `ArtifactsService` lo reconocía;
`ProjectsService`, `CardSortingService` y `EvaluacionHeuristicaService`
seguían chequeando acceso solo por `creadoPorId`/ADMIN.

1. **`ProjectAccessService` compartido.** Nuevo
   (`core/access/project-access.service.ts`), registrado en un módulo
   `@Global` (`core/access/project-access.module.ts`) para no tener que
   importarlo a mano en cada módulo feature. Dos métodos:
   - `assertAccess(proyectoId, user, mensaje?)`: dueño, ADMIN, o miembro
     (`ProyectoMiembro`). Uso normal (leer/crear/editar dentro del
     proyecto).
   - `assertOwnerOrAdmin(proyectoId, user, mensaje?)`: dueño o ADMIN
     únicamente — un miembro no alcanza. Para operaciones administrativas
     del proyecto (gestionar la membresía). Devuelve `{ creadoPorId }`
     para evitar un segundo `findUnique` en el caller.

   Reemplaza el chequeo inline duplicado en 4 lugares: el
   `assertProjectAccess` privado de `ArtifactsService` (ya reconocía
   miembros desde F5, pero estaba encerrado ahí), y los chequeos de solo
   `creadoPorId`/ADMIN en `ProjectsService.findOne`,
   `CardSortingService.createSession`, y
   `EvaluacionHeuristicaService.crearSesion`/`obtenerAnalitica`. Estos
   tres últimos ahora también reconocen `ProyectoMiembro` — antes no lo
   hacían, aunque el modelo ya existiera desde Ronda 5.

2. **Endpoints de miembros.** Nuevo en `projects.controller.ts` /
   `projects.service.ts`:
   - `GET /projects/:id/miembros` — lista miembros con datos básicos del
     usuario (`id`, `nombre`, `email`, `rol`). Acceso: cualquiera con
     `assertAccess` (dueño, ADMIN, o miembro — no hace falta ser dueño
     para ver la lista).
   - `POST /projects/:id/miembros` (`{ email }`) — agrega un miembro
     existente por email. Acceso: `assertOwnerOrAdmin` (un miembro no
     puede agregar a otro). Si el email no corresponde a ningún
     `Usuario`, `404`. Implementado con `upsert` sobre
     `@@unique([proyectoId, usuarioId])`: agregar dos veces al mismo
     usuario no falla, es idempotente.
   - `DELETE /projects/:id/miembros/:usuarioId` — quita un miembro.
     Acceso: `assertOwnerOrAdmin`. Bloqueado explícitamente si
     `usuarioId` es el creador del proyecto (`400`, "No puedes quitar al
     creador del proyecto") — el creador no es una fila de
     `ProyectoMiembro` gestionable, es el dueño real.

   **Sin invitación por correo ni creación de cuentas nuevas**: agregar
   por email requiere que el `Usuario` ya exista y tenga cuenta creada.
   Fuera de alcance a propósito (no pedido).

3. **Bug preexistente encontrado y corregido en los tests** (ver
   `docs/AUDIT_LOG.md` G1): `artifacts.service.spec.ts` nunca tuvo
   `proyectoMiembro` en su mock de `prisma`, pese a que
   `assertProjectAccess` ya lo consultaba desde F5 (Ronda 5). Los 3 tests
   que ejercitaban el camino "usuario sin acceso" (`create`,
   `softDelete`, `acquireLock` con `otherUser`) tiraban `TypeError` en
   vez de validar `ForbiddenException` — el `.rejects.toThrow(...)`
   probablemente los dejaba pasar en verde igual por cómo Jest resuelve
   esa aserción contra un rechazo no instanciado del tipo esperado, pero
   no estaban probando lo que decían probar. Corregido agregando
   `proyectoMiembro: { findUnique: jest.fn() }` al mock.

**Specs actualizados** (necesario: los 4 servicios tocados ahora
requieren `ProjectAccessService` en el constructor, así que los
`Test.createTestingModule` que los instancian directo se rompían sin
proveerlo):
   - `projects.service.spec.ts` y `artifacts.service.spec.ts`: usan el
     `ProjectAccessService` **real** (no mockeado) sobre el mismo mock de
     `prisma`, porque ambos specs sí ejercitan el comportamiento de
     ownership/forbidden en detalle.
   - `card-sorting.service.spec.ts` y
     `evaluacion-heuristica.service.spec.ts`: usan un mock simple
     (`{ assertAccess: jest.fn() }`) porque ninguno de los dos testea los
     métodos que llaman a `assertAccess` (`createSession`, `crearSesion`,
     `obtenerAnalitica`).

**Verificado:** `npx tsc --noEmit` sin errores propios (nota: hay un
`dist/tsconfig.tsbuildinfo` cacheado del build original en el zip
entregado por el usuario, así que este resultado no es 100% confiable
como confirmación de tipos — puede estar salteando re-chequeos por la
caché incremental). `npx jest`: 2 suites pasan completas
(`projects.service.spec.ts` 12/12, `env.validation.smoke.spec.ts`);
4 suites (`artifacts`, `card-sorting`, `evaluacion-heuristica`, `auth`)
no llegan a correr — fallan en la fase de tipos porque el
`@prisma/client` instalado en este entorno de trabajo es un placeholder
sin los enums reales del schema (`TipoArtefacto`, `ActorSesion`,
`EstadoSesion`, `TipoSesion`): `prisma generate` no pudo completar
porque `binaries.prisma.sh` no tiene salida a internet en este sandbox
(`403 Forbidden` al bajar `schema-engine`/`query-engine`, probado con
`PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`, `--no-engine`, y engine type
`wasm`, sin éxito). **Es una limitación del entorno de trabajo, no de
este código** — los imports que fallan (`import { TipoArtefacto } from
'@prisma/client'`, etc.) son líneas preexistentes que este cambio no
tocó. Falta correr `pnpm prisma generate` + `pnpm test` en un entorno
con red real (o Docker, como en sprints anteriores) para confirmar esas
4 suites.

**Pendiente real, no cerrado en esta ronda (Fase 2):**
- Frontend: pantalla "Miembros del proyecto" (agregar por email) en
  `ProjectDetailLayout.tsx` — el backend ya está completo y listo para
  consumir, falta la UI y el cliente API correspondiente.
- No se agregaron tests nuevos para `listMembers`/`addMember`/
  `removeMember` — fuera del alcance acordado para esta ronda (se pidió
  cerrar el backend de Fase 2, tests de frontend quedaron para Fase 3).

## Ronda 2 (decisiones confirmadas por el dueño)

1. **Granularidad por campo restaurada.** `main.ts` ahora tiene un
   `exceptionFactory` custom en el `ValidationPipe` existente (mismo
   `whitelist/transform/forbidNonWhitelisted` de siempre, solo se agregó
   esa opción). Aplana los `ValidationError` de class-validator —
   incluyendo anidados, ej. `contenido.hobbies.0` — a
   `[{ campo, mensaje }]`. El filtro global y ambos clientes HTTP
   (`api-client.ts`, `artifacts.api.ts`) ya esperan y propagan esa forma
   en `ApiValidationError.detalles` / `ArtifactsApiError.detalles`.
   Con eso ya puedes hacer `detalles.find(d => d.campo === 'nombreCompleto')`
   en un formulario para marcar el input exacto.

2. **`{data, meta}` confirmado inexistente** — sin cambios sobre la ronda 1,
   se mantiene el desenvoltorio plano.

3. **`ToastContainer.tsx` nuevo** en `shared/components/`. Escucha
   `window.addEventListener('app:toast', ...)`, apila hasta N avisos,
   auto-descarta a los 5s, botón `×` para cerrar antes, respeta
   `prefers-reduced-motion`. Estilo neutro (fondo casi negro, acento de
   3px por tipo — terracota apagado para error, verde apagado para
   success, azul apagado para info) — deliberadamente NO usé el
   cream+terracota #D97757 por defecto de IA, ni cards con sombra
   genérica; paleta más apagada/editorial, acorde a un tool académico.

   **Montado:** confirmado en `main.tsx`, dentro de `<BrowserRouter>`,
   una sola vez. Resuelto.

## Nuevos (no existían, ronda 2)

- `apps/backend/src/common/filters/global-exception.filter.ts`
- `apps/frontend/src/shared/api/toast.ts`
- `apps/frontend/src/shared/components/ToastContainer.tsx`

## Editados (diff quirúrgico, resto del archivo intacto, ronda 2)

- `apps/backend/src/main.ts` — filtro global + `exceptionFactory` estructurado.
  Tu `ConfigService`, `helmet`, `SwaggerModule` — sin tocar.
- `apps/frontend/src/shared/api/api-client.ts` — parseo de error a
  `{campo,mensaje}[]`, se quitó `json.data`. Reconexión 401 — intacta.
- `apps/frontend/src/shared/api/artifacts.api.ts` — mismo criterio, espejo.

## Ronda 3 (frontend — fases 3-4 + estilo + fix DTO heurística)

1. **Fases 3 y 4 del frontend implementadas.** `ProjectDetailLayout` con
   sub-navegación, y las páginas de Personas, Journey Map, Momentos
   Críticos, Card Sorting y Evaluación Heurística. `App.tsx` actualizado
   con las rutas anidadas correspondientes.

2. **Capa API nueva para Evaluación Heurística** (`evaluacion-heuristica.api.ts`
   + hooks), que no existía. Validada campo por campo contra el
   `HeuristicaDto` real del backend (`heuristicaId`, `severidad`,
   `descripcion`, `evidencia?`, `recomendacion?`) — la hipótesis inicial
   tenía `heuristica` y `pantalla`, ya corregidos.

3. **`theme.css` nuevo**, extraído del mockup de referencia
   (`UX-Observatory-Presentacion.html`). Aplicado a Login, sidebar/topbar
   (`AppLayout`) y Dashboard. Importado una vez en `main.tsx`.

## Ronda 5 (Fase 0 de robustez + acceso multi-usuario mínimo)

1. **Doble unlock al guardar, corregido.** `resetForm()` es ahora la única
   fuente de verdad para desbloquear un artefacto en las 3 páginas; se
   quitó el `unlockX(idAEditar)` suelto del `onSuccess` de `actualizar(...)`.
   Ver `docs/AUDIT_LOG.md` F2.

2. **`softDelete` y `acquireLock` en `artifacts.service.ts`, endurecidos.**
   `softDelete` ahora chequea el lock contra la última versión del
   artefacto lógico (antes lo hacía contra la fila de la URL). `acquireLock`
   pasa de "chequear-luego-actualizar" a un `updateMany` condicional
   atómico, cerrando una condición de carrera real bajo concurrencia. Ver
   `docs/AUDIT_LOG.md` F3 y F4.

3. **Accesibilidad: `aria-label` en los 3 formularios.** `PersonasPage.tsx`,
   `JourneyMapPage.tsx` y `MomentosCriticosPage.tsx` dependían solo de
   `placeholder` (que un lector de pantalla no trata como label). Cada
   input/textarea/select relevante ahora tiene `aria-label` explícito.

4. **Modelo `ProyectoMiembro` (acceso multi-usuario mínimo).** Nueva tabla
   (`proyectoId`, `usuarioId`, `@@unique([proyectoId, usuarioId])`) +
   migración `20260904000000_add_proyecto_miembro` con backfill (cada
   proyecto existente conserva a su creador como miembro, nadie pierde
   acceso). `assertProjectAccess` en `artifacts.service.ts` ahora acepta
   creador, ADMIN o miembro — antes solo creador/ADMIN. Ver
   `docs/AUDIT_LOG.md` F5.

   **Alcance acotado a propósito:** no se agregaron endpoints para
   gestionar miembros (agregar/quitar por email) ni pantalla de UI para
   eso — queda pendiente si se retoma la Fase 2 completa. Tampoco se tocó
   el control de acceso de `ProjectsService`, `CardSortingService` ni
   `EvaluacionHeuristicaService`, que siguen chequeando solo `creadoPorId`.

5. **Seed: reemplazadas las cuentas de prueba.** `evaluador@ux.utem.cl`
   (cuenta única) fue reemplazada por 3 cuentas de estudiante reales
   (`estudiante1@ux.utem.cl`, `estudiante2@ux.utem.cl`,
   `estudiante3@ux.utem.cl`, contraseña `Demo1234!` o `SEED_PASSWORD`),
   las 3 como `ProyectoMiembro` del mismo proyecto demo (una de ellas,
   además, `creadoPorId`). Esto permite finalmente probar el lock
   pesimista entre usuarios distintos sobre el mismo artefacto. El usuario
   DOCENTE de prueba (`profesor@test.com`, Ronda 4) no cambió.

## Ronda 4 (frontend — lock conectado en las 3 páginas de artefactos)

1. **Bloqueo pesimista conectado a la UI.** `PersonasPage.tsx`,
   `JourneyMapPage.tsx` y `MomentosCriticosPage.tsx` ahora llaman
   `lockX.mutate` al abrir el formulario de edición (`handleIniciarEditar`/
   `handleStartEdit`) y `unlockX.mutate` tanto al cancelar (`resetForm`)
   como en el `onSuccess` de la actualización. Si el `lock` devuelve `409`
   (bloqueado por otro usuario), se muestra `notify.error(...)` y el
   formulario queda deshabilitado (`<fieldset disabled>`) — no se puede
   editar hasta que el lock se libere o expire.

2. **Seed nuevo: usuario DOCENTE de prueba.** `profesor@test.com` /
   `profesor123` (contraseña configurable vía `SEED_PROFESOR_PASSWORD`),
   con un proyecto propio ya cargado con las 5 técnicas (Card Sorting,
   Evaluación Heurística, Persona, Journey Map, Momentos Críticos), para
   QA manual sin tener que crear datos a mano. Ver `docs/BACKEND.md`.

## ⚠️ Pendiente real (revisado — ronda 3, corregido tras ver hooks/artifacts.api.ts)

- ~~Riesgo de rutas en español muertas~~ — **Descartado.**
  `shared/api/artifacts.api.ts` ya usa `/projects/:proyectoId/artifacts`
  en inglés en las 6 funciones que expone. Sin riesgo.

- ~~**Falta vista de edición en Personas/Journey Map/Momentos Críticos.**~~
  **Cerrado en Ronda 4** — ver arriba. La capa de hooks (`useUpdatePersona`,
  `useLockPersona`/`useUnlockPersona`, y sus equivalentes en journey-map y
  momentos-criticos) ya estaba completa desde esta ronda; lo que faltaba
  era la UI, resuelto en Ronda 4.

- **`getAuthToken()` en `artifacts.api.ts` es un placeholder** (lee
  `localStorage.getItem('evaluadorToken')`) a la espera de un authStore
  real de evaluador — ya señalado en el propio archivo como TODO del
  equipo, no es algo que rompimos nosotros.

## Pendiente real, no resuelto (ronda 2, sigue vigente)

- El fallback `campo: ''` cubre un 400 lanzado a mano (`throw new
  BadRequestException('mensaje suelto')`, sin pasar por ValidationPipe).
  Si tu equipo dispara ese tipo de excepción manual en algún servicio,
  el formulario no podrá resaltar un input específico para ese caso —
  es información que el propio `throw` manual nunca tuvo.
