# FASE F26: Selección de partes en los PDF

Estado: hecha. Se verificó cada parte por separado.

Archivos tocados: `informe-pdf.ts` y su prueba, `InformePdfDialog.tsx`, `InformeView.tsx`, `flujo.test.tsx`, `PdfContentPicker.tsx`, `report-data.ts` y su prueba, `ExportReportDialog.tsx` y su prueba, `pdf.ts`, `CHANGELOG.md` y este cierre.

- Heurística conserva la portada. La escala es parte de «Criterios». El registro de decisiones y las aprobaciones quedan bajo «Resultado y participación». Se cargan capturas únicamente de las partes elegidas.
- El informe del proyecto conserva los encabezados y emite los bloques elegidos en el orden habitual. Si una técnica queda sin partes, se excluye del PDF y de la carga de datos.

Comandos ejecutados y resultado

- Parte A. `pnpm --filter frontend test` → 85 archivos y 815 pruebas pasan. `pnpm --filter frontend build` → salida 0.
- Parte B. `pnpm --filter frontend test` → 86 archivos y 816 pruebas pasan. `pnpm --filter frontend build` → salida 0.
- Ambas partes incluyen pruebas de selección parcial y equivalencia de la selección explícita completa con la predeterminada.
- Playwright descargó sobre PostgreSQL de pruebas un PDF heurístico con hallazgos y un PDF de proyecto con necesidades de Personas. `pdfinfo` validó ambos archivos de dos páginas.

Pendientes: ninguno.
