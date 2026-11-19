# FASE F2: Instrucciones con un solo formato

Estado: hecha (textos de Card Sorting aprobados por el usuario el 2026-11-18)
Archivos tocados: `apps/frontend/src/shared/components/TechniqueInstructions.tsx` (nuevo), `apps/frontend/src/shared/components/TechniquePageHeader.tsx`, `apps/frontend/src/shared/components/TechniquePageHeader.test.tsx`, `apps/frontend/src/pages/CardSortingPage.tsx`, `apps/frontend/src/pages/CardSortingPage.test.tsx`, `apps/frontend/src/features/card-sorting/components/CardSortingGuide.tsx` (borrado), `apps/frontend/src/features/card-sorting/components/CardSortingGuide.test.tsx` (borrado), `apps/frontend/src/styles/theme.css`, `docs/fases/APROBACIONES_PENDIENTES.md` (nuevo).

Comandos ejecutados y resultado:
- `grep -n "CardSortingGuide|cs-guide" apps/frontend/src` -> antes: solo `CardSortingPage`, su prueba y el CSS; después: sin resultados.
- `grep -n "cs-guide|CardSortingGuide" apps tests` -> sin resultados (código de salida 1).
- `pnpm --filter frontend exec vitest run src/pages/CardSortingPage.test.tsx src/shared/components/TechniquePageHeader.test.tsx` -> 2 archivos, 34 pruebas en verde.
- `pnpm --filter frontend exec vitest run src/shared/components src/pages/__tests__ src/features/card-sorting` -> 31 archivos, 276 pruebas en verde.
- `pnpm --filter frontend test` y `pnpm --filter frontend build` -> verdes en la corrida conjunta (ver F5).

Hecho:
- Paso 1: componente compartido `TechniqueInstructions` (`InstructionList = Array<string | { texto; enLaHerramienta? }>`); `TechniquePageHeader` lo usa cuando `instructions` es una lista. Los `string[]` de Personas, Journey Map, Momentos críticos y Evaluación heurística siguen funcionando con su texto intacto.
- Paso 2 y 3: aprobada la tabla de `APROBACIONES_PENDIENTES.md`, los 8 acordeones de `CardSortingGuide` pasan a 6 pasos del mismo formato en `CardSortingPage`, con la línea "En la herramienta:" en cada paso y el texto nuevo de R27: "Si una tarjeta podría ir en varios lugares, elige la mejor opción y colócala ahí."
- Se conservan: grupo de 3 invitado por separado (cuenta como tres participantes), jerarquía de 2 niveles solo en abiertos e híbridos, umbral de consenso editable (50 % por defecto) y dónde se ven los resultados (matriz, ubicaciones populares, respuestas, tarjetas, categorías, agrupaciones dominantes y sin consenso).
- Paso 4: eliminados `CardSortingGuide` y su prueba, y todo el CSS `cs-guide-*`; el estilo de `.technique-instructions` queda en uno solo (se retira el override de `.personas-page`).

Cambios respecto al plan (desvíos): en el paso 5 se conserva la frase "Pregunta al participante para entender sus decisiones." del antiguo paso 6, para no perder contenido al fusionar (la tabla aprobada fusionaba los pasos 4 y 6 en el 5). No se agregó contenido nuevo salvo el texto de R27 que el plan fija literal.

Pendientes y dudas:
- Sin Playwright no se pudieron tomar las capturas de las cinco páginas con el panel abierto a 375 px y escritorio; el formato se verifica con las pruebas del componente y de la página.
