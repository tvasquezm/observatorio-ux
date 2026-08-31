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

   **Dónde montarlo:** no tengo tu `App.tsx` ni `main.tsx` reales (no
   venían en el tar), así que no puedo editarlos directamente. Móntalo
   UNA sola vez, en el nivel más alto de tu árbol de React — típicamente
   en `App.tsx`, así:
   ```tsx
   import { ToastContainer } from './shared/components/ToastContainer';

   export function App() {
     return (
       <>
         {/* tu router / providers existentes */}
         <ToastContainer />
       </>
     );
   }
   ```
   Si tu raíz real está en `main.tsx` en vez de `App.tsx`, el mismo patrón
   aplica ahí — solo que quede UNA vez, no una por feature.

## Nuevos (no existían)

- `apps/backend/src/common/filters/global-exception.filter.ts`
- `apps/frontend/src/shared/api/toast.ts`
- `apps/frontend/src/shared/components/ToastContainer.tsx`

## Editados (diff quirúrgico, resto del archivo intacto)

- `apps/backend/src/main.ts` — filtro global + `exceptionFactory` estructurado.
  Tu `ConfigService`, `helmet`, `SwaggerModule` — sin tocar.
- `apps/frontend/src/shared/api/api-client.ts` — parseo de error a
  `{campo,mensaje}[]`, se quitó `json.data`. Reconexión 401 — intacta.
- `apps/frontend/src/shared/api/artifacts.api.ts` — mismo criterio, espejo.

## ⚠️ Pendiente real, no resuelto acá

- El fallback `campo: ''` cubre un 400 lanzado a mano (`throw new
  BadRequestException('mensaje suelto')`, sin pasar por ValidationPipe).
  Si tu equipo dispara ese tipo de excepción manual en algún servicio,
  el formulario no podrá resaltar un input específico para ese caso —
  es información que el propio `throw` manual nunca tuvo.

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

## ⚠️ Pendiente real, detectado al cruzar con ARCHITECTURE.md §5 y §3 (NO resuelto en esta ronda)

- **Riesgo de rutas en español muertas.** `ARCHITECTURE.md §5` documenta
  que se eliminaron los alias `/api/proyectos/*` y
  `/api/proyectos/:proyectoId/artefactos/*`. Las páginas de Personas/
  Journey Map/Momentos Críticos consumen hooks (`features/persona`,
  `features/journey-map`, `features/momentos-criticos`) que ya existían
  antes de esta ronda y nunca se revisaron contra este cambio de rutas —
  pendiente confirmar que apuntan a `/api/projects/.../artifacts` en
  inglés y no a la ruta en español ya removida.

- **Lock/unlock no implementado en el frontend.** `ARCHITECTURE.md §3`
  (corrección post-auditoría B4/B9/B14) documenta que el backend ahora
  requiere `POST .../artifacts/:artefactoId/lock` al entrar a editar un
  artefacto y `DELETE .../lock` al salir. Ninguna de las páginas de
  Personas/Journey Map/Momentos Críticos entregadas hasta ahora llama a
  estos endpoints — dos personas editando el mismo artefacto pueden
  seguir pisándose el trabajo hasta que se agregue.
