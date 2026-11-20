# FASE F18: Estilo de PDF y selector reutilizable

Estado: hecha.

Archivos tocados: `pdf-base.ts` y su prueba, `PdfContentPicker.tsx` y su prueba, `CardSortingPdfDialog.tsx`, `card-sorting-pdf.ts` y su prueba, `card-sorting-pdf-content.ts`, `informe-pdf.ts`, `CHANGELOG.md` y este cierre.

Las tablas tienen líneas horizontales, más espacio vertical y primera columna en negrita. Los títulos conservan el texto y suman un acento. El selector de Card Sorting conserva sus opciones, incluido el modo blanco y negro.

Comandos ejecutados y resultado

- `pnpm --filter frontend exec vitest run src/features/card-sorting src/shared` → 35 archivos y 256 pruebas pasan. La prueba del diálogo existente pasó sin cambios.
- `pnpm --filter frontend test` → 85 archivos y 812 pruebas pasan. En una corrida concurrente inicial fallaron pruebas de matriz heurística y Journey Map por tiempos de ejecución. La corrida completa posterior pasó sin silenciar pruebas.
- `pnpm --filter frontend build` → salida 0.
- Playwright descargó PDF de Card Sorting y heurística sobre la base de pruebas. Se revisó la segunda página de cada PDF renderizada con `pdftoppm`. Ambas muestran separadores y acentos. Se amplió la columna de porcentaje para evitar que el encabezado se partiera dentro de una palabra.

Pendientes: ninguno.
