# FASE F2: Instrucciones con un solo formato

Estado: parcial (esperando aprobación de los textos de Card Sorting)
Archivos tocados: `apps/frontend/src/shared/components/TechniqueInstructions.tsx` (nuevo), `apps/frontend/src/shared/components/TechniquePageHeader.tsx`, `apps/frontend/src/shared/components/TechniquePageHeader.test.tsx`, `apps/frontend/src/styles/theme.css`, `docs/fases/APROBACIONES_PENDIENTES.md` (nuevo).

Comandos ejecutados y resultado:
- `grep -n "CardSortingGuide\|cs-guide" apps/frontend/src` -> el componente lo usa solo `CardSortingPage` (línea 354) y su prueba; el CSS `cs-guide-*` está en `theme.css`.
- `pnpm --filter frontend exec vitest run src/shared/components src/pages/__tests__ src/features/card-sorting` -> 31 archivos, 276 pruebas en verde (incluye la prueba nueva del paso con "En la herramienta:").

Hecho:
- Paso 1: componente compartido `TechniqueInstructions` con `InstructionList = Array<string | { texto: string; enLaHerramienta?: string }>`; `TechniquePageHeader` lo usa cuando `instructions` es una lista. Los `string[]` de Personas, Journey Map, Momentos críticos y Evaluación heurística siguen funcionando con su texto intacto.
- Paso 4 (solo la parte de estilos): se eliminó el override `.personas-page > .technique-instructions` y queda un único estilo de `.technique-instructions` (el global). Se agregó `.technique-step-where` para la línea "En la herramienta:".

No hecho, y por qué:
- Pasos 2, 3 y el resto del 4: condensar los 8 pasos de `CardSortingGuide` en 6, agregar la indicación de la tarjeta que podría ir en varios lugares y eliminar `CardSortingGuide` con su CSS `cs-guide-*` cambian los textos de Card Sorting. El plan exige aprobación expresa del usuario y no la tengo; la tabla antes -> después quedó en `docs/fases/APROBACIONES_PENDIENTES.md`. Por eso no se borró `CardSortingGuide` ni su CSS.

Cambios respecto al plan (desvíos): ninguno; es la ejecución de la regla 8 (textos sin aprobación no se escriben).

Pendientes y dudas:
- Aprobación del usuario para la tabla de `APROBACIONES_PENDIENTES.md` (8 pasos -> 6 y párrafo de entrada). Al aprobarla se completan los pasos 2 y 4 y F2 pasa a "hecha".
- Sin Playwright no se pudieron tomar las capturas de las cinco páginas a 375 px y escritorio; el formato se verifica con las pruebas del componente.
