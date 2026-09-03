# Cambios aplicados — kit v2 (sobre archivos reales)

Todo acá parte de TUS archivos reales que subiste, con ediciones mínimas
y quirúrgicas. No hay archivos inventados desde cero salvo los indicados.

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
