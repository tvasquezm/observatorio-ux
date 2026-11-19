# FASE F3: Comentarios de heurística alineados

Estado: hecha
Archivos tocados: `apps/frontend/src/pages/EvaluacionHeuristicaPage.tsx`, `apps/frontend/src/features/heuristica-flujo/FlujoHeuristicaPage.tsx`, `apps/frontend/src/features/heuristica-flujo/flujo.test.tsx`.

Comandos ejecutados y resultado:
- `grep -n "EvaluacionHeuristicaPage\|comentarios=" apps/frontend/src` -> confirmado: las otras cuatro técnicas pasan `ComentariosTecnica` por el slot `comentarios` de `TechniquePage`; solo Evaluación heurística lo pintaba fuera, en `EvaluacionHeuristicaPage` (hermano de `FlujoHeuristicaPage`).
- `pnpm --filter frontend exec vitest run src/features/heuristica-flujo src/features/comments` -> 14 archivos, 306 pruebas en verde (incluye la prueba nueva).

Cambios respecto al plan (desvíos): ninguno. `EvaluacionHeuristicaPage` queda solo con `<FlujoHeuristicaPage />`; el panel de comentarios no cambia de contenido, solo de sitio. Confirmado al ejecutar que `TechniquePage` envuelve todas las ramas de la página (carga, error, evaluación abierta e historial), así que el desplegable de Comentarios se ve siempre, también con una evaluación abierta.

Pendientes y dudas:
- No hay Playwright disponible para la captura comparada con Personas a 375 px y escritorio; la igualdad de posición, ancho y margen se garantiza porque las cinco técnicas usan ahora el mismo slot de `TechniquePage`. Se anota como evidencia no capturada.
