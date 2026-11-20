# FASE F16: Informe heurístico con problemas al final y conteos claros

Estado: hecha.

Archivos tocados: `ConsensoEditor.tsx`, `InformeView.tsx`, `ResumenCriterios.tsx`, `informe-pdf.ts`, `shared/utils/pdf.ts`, `flujo.test.tsx`, `ResumenCriterios.test.tsx` y este cierre.

«Preparar el informe» reúne los problemas que detectó el equipo y los aspectos positivos. Al crear una decisión, el foco va a sus campos y la decisión sigue en pendientes hasta que se completa. Quien no redacta ve la sección en solo lectura. El informe y sus PDF distinguen criterios y hallazgos aceptados.

Comandos ejecutados y resultado

- Pruebas de flujo y resumen antes del cambio → cinco fallos con los nuevos requisitos.
- `pnpm --filter frontend exec vitest run src/features/heuristica-flujo` → 12 archivos y 294 pruebas pasan.
- `pnpm --filter frontend test` → 83 archivos y 809 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- Búsqueda de las etiquetas anteriores → sin coincidencias en interfaz ni salidas PDF. Se conservan menciones en comentarios y en la prueba que comprueba ausencia.

Pendientes: ninguno.
