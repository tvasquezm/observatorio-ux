# Onboarding — Frontend de Observatorio UX

Guía de arranque para quien se sume a trabajar en `apps/frontend`. No reemplaza
`ARCHITECTURE.md`, `BACKEND.md` ni `CAMBIOS.md` — los resume y apunta a ellos
cuando hace falta más detalle.

---

## 1. Stack y arranque

- Monorepo **pnpm** (`apps/backend`, `apps/frontend`, `packages/shared-types`).
- Frontend: **Vite + React + React Router + TanStack Query**.
- Levantar todo con Docker (recomendado, cero instalación local):
  ```bash
  cp .env.example .env
  docker compose up --build
  ```
  Frontend en `http://localhost:5173`, API en `http://localhost:3000/api`,
  Swagger en `http://localhost:3000/api/docs`.
- Alternativa sin Docker (`pnpm --filter backend start:dev`, etc.) →
  ver `docs/comandos-backend.md`.
- Usuario semilla: `evaluador@ux.utem.cl` / `Demo1234!`.
- Usuario DOCENTE de prueba (login simple para QA manual, con un proyecto
  ya cargado con las 5 técnicas): `profesor@test.com` / `profesor123`.
  Ver `docs/BACKEND.md`.

## 2. Autenticación en el frontend

- El token del evaluador se guarda en `localStorage` bajo la clave
  **`evaluadorToken`**. Todos los clientes HTTP del frontend
  (`projects.api.ts`, `artifacts.api.ts`, `evaluacion-heuristica.api.ts`)
  lo leen igual: `localStorage.getItem('evaluadorToken')`.
- **Ojo:** `shared/api/artifacts.api.ts` deja explícito en un comentario que
  esto es un placeholder — no hay un authStore real de evaluador todavía
  (Zustand u otro). El de participante sí existe (`api-client.ts`, clave
  `participanteToken`). Si armás ese authStore, hay que actualizar los 3
  archivos de arriba para leer de ahí en vez de `localStorage` directo.

## 3. Estructura de carpetas (patrón a seguir)

```
apps/frontend/src/
  features/<dominio>/
    api/<dominio>.api.ts       ← fetch + tipos, SIN estado ni hooks
    hooks/use<Dominio>Queries.ts ← TanStack Query sobre la api de arriba
  pages/                        ← una página por ruta, consume hooks de features/
  layouts/                      ← AppLayout (shell), ProjectDetailLayout (sub-nav)
  shared/api/                   ← clientes genéricos compartidos
  shared/components/            ← ToastContainer, etc.
  styles/theme.css              ← paleta y clases del mockup, importado 1 vez en main.tsx
```

Cada `api.ts` es independiente de `packages/shared-types` a propósito — los
tipos de UI se duplican ahí en vez de importar el build compartido (mismo
criterio en `card-sorting`, `persona`, `journey-map`, `momentos-criticos`).

## 4. El patrón más importante: `UxArtifact`

Persona, Journey Map y Momentos Críticos **no son 3 módulos de backend
separados** — son 1 solo modelo genérico (`UxArtifact`) con un campo
`tipo: PERSONA | JOURNEY_MAP | MOMENTOS_CRITICOS`. En el frontend esto se
refleja como:

- `shared/api/artifacts.api.ts` — cliente genérico único: `listArtifacts`,
  `getArtifact`, `createArtifact`, `createArtifactVersion`, `acquireLock`,
  `releaseLock`, `deleteArtifact`.
- `features/persona/api/persona.api.ts`, `features/journey-map/api/journey-map.api.ts`,
  `features/momentos-criticos/api/momentos-criticos.api.ts` — wrappers
  delgados que llaman a lo de arriba con el `tipo` fijo y tipan el
  `contenido` específico de cada uno.

**Cosas de este modelo que cualquiera que edite estas 3 features necesita saber:**

- **Versionado append-only.** Editar NO hace `PATCH` sobre el mismo registro
  — crea una fila nueva (`createArtifactVersion` → `POST .../versions`) con
  `version + 1`. Todas las versiones comparten `artefactoLogicoId`.
- **`listArtifacts` devuelve TODAS las versiones**, no solo la última. Por
  eso existe `dedupeLatestVersions()` — hay que llamarlo siempre antes de
  mostrar una lista, si no vas a ver artefactos duplicados en pantalla.
- **Bloqueo pesimista con TTL.** Antes de editar hay que
  `POST .../artifacts/:id/lock` (default 5 min, tope 30 min vía
  `ttlSegundos`) y `DELETE .../lock` al terminar. Si otro usuario tiene el
  lock vigente, el backend responde `409 Conflict`. Los hooks
  (`useLockPersona`/`useUnlockPersona` y sus equivalentes) **ya están
  conectados** en las 3 páginas (`PersonasPage`, `JourneyMapPage`,
  `MomentosCriticosPage`, Sprint 4): `lock` al abrir el formulario de
  edición, `unlock` al cancelar o tras guardar con éxito, y si el `lock`
  devuelve `409` el formulario queda en solo lectura con un
  `notify.error(...)` avisando quién lo tiene tomado. No hay `unlock` al
  desmontar el componente sin pasar por cancelar/guardar (navegar fuera a
  mitad de edición) — ahí el TTL del backend es la red de seguridad.
- **Soft delete.** `deleteArtifact` no borra la fila — marca `deletedAt`.
  El objeto devuelto sigue "existiendo", solo desaparece de
  `listArtifacts`.
- Las "etapas" del Journey Map y los "incidentes" de Momentos Críticos
  **no son entidades propias** — son arrays dentro de `contenido`. Se editan
  mutando el array en memoria (`addPhase`/`replacePhase`/`removePhase`,
  `addIncidente`/`replaceIncidente`/`removeIncidente`) y persistiendo con
  `updateJourney`/`updateCriticalMoment` (o sea, una nueva versión completa).

## 5. Manejo de errores — forma `{campo, mensaje}`

El backend devuelve los 400 de validación como `message: [{campo, mensaje}]`
(incluye anidados, ej. `contenido.hobbies.0`). Todos los clientes HTTP del
frontend ya parsean esto:

```ts
catch (err) {
  if (err instanceof ArtifactsApiError && err.detalles) {
    const campoConError = err.detalles.find(d => d.campo === 'nombreCompleto');
  }
}
```

**Excepción conocida:** si algún endpoint del backend lanza
`throw new BadRequestException('mensaje suelto')` a mano (sin pasar por el
`ValidationPipe`), el `campo` llega vacío (`''`) — no hay forma de resaltar
un input específico para ese caso. No es un bug del frontend, es una
limitación de origen.

## 6. Rutas — no todas están en el mismo idioma (todavía)

- ✅ `/api/projects/*` y `/api/projects/:proyectoId/artifacts/*` — **inglés**,
  consolidado (el alias en español se eliminó).
- ⚠️ `/api/proyectos/:proyectoId/evaluacion-heuristica/sesiones/*` — sigue
  en **español**, sin alias en inglés. No lo migres sin coordinar con el
  equipo (`ARCHITECTURE.md §5` lo deja pendiente a propósito).

## 7. Estilo — `theme.css`

Extraído del mockup de referencia (`UX-Observatory-Presentacion.html`).
Variables clave: `--navy`, `--teal`, `--mint`, `--ink`, `--muted`, `--bg`,
`--line`, `--coral`. Clases reutilizables ya definidas: `.panel`,
`.panel-head`, `.metric`, `.primary`/`.secondary`, `.project-row`,
`.nav-btn`, `.field`. Antes de escribir CSS nuevo, revisar si ya existe una
clase para eso — el objetivo es que toda página nueva se vea consistente
con el mockup sin reinventar estilos sueltos por página.

## 8. Pendientes conocidos para quien siga

1. ~~Falta la vista de edición en Personas/Journey Map/Momentos Críticos.~~
   **Resuelto (Sprint 4):** las 3 páginas ya llaman `lock`/`update`/`unlock`
   end-to-end, con manejo de `409` (solo lectura + toast). Sigue pendiente:
   liberar el lock también al desmontar el componente sin guardar/cancelar
   explícitamente (hoy depende del TTL de 5 min como red de seguridad).
2. **No hay authStore de evaluador.** `getAuthToken()` en `artifacts.api.ts`
   es un placeholder sobre `localStorage` directo.
3. **`EvaluacionHeuristicaController` sigue en español**, sin alias en
   inglés — pendiente de decisión de equipo, no tocar sin avisar.
4. Deuda técnica específica de Evaluación Heurística (backend) en
   `docs/deuda-tecnica-heuristica.md`: tipado débil en auth (`usuario: any`),
   `/auth/test-token` no distingue tipo de usuario, posible `console.log`
   suelto en `EvaluacionHeuristicaController.crear`.

## 9. Dónde mirar si algo no calza

| Duda | Archivo |
|---|---|
| ¿Por qué persona/journey/momentos comparten un módulo? | `docs/ARCHITECTURE.md` §Sprint 2.1 |
| ¿Cómo funciona el versionado? | `docs/ARCHITECTURE.md` §Sprint 2.2 |
| ¿Cómo funciona el lock? | `docs/ARCHITECTURE.md` §Sprint 2.3 |
| ¿Qué rutas existen y cuáles se borraron? | `docs/ARCHITECTURE.md` §Sprint 2.5 |
| ¿Cómo levanto el backend? | `docs/BACKEND.md`, `docs/comandos-backend.md` |
| ¿Qué se cambió recién y por qué? | `docs/CAMBIOS.md` |
| ¿Qué le falta al módulo de heurística? | `docs/deuda-tecnica-heuristica.md` |
