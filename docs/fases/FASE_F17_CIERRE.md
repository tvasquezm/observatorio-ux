# FASE F17: Resultados de Card Sorting, contraste y ancho

Estado: hecha.

Archivos tocados: `theme.css`, `contraste-celdas.test.ts`, `CardSortingDendrogram.tsx`, `CHANGELOG.md`, este cierre y seis [capturas](FASE_F17_capturas/).

| Tema y estado | Intensidad 0 | 0,25 | 0,5 | 0,75 | 1 |
|---|---:|---:|---:|---:|---:|
| Claro antes | 12,03 | 9,34 | 7,09 | 5,24 | 3,78 |
| Claro después | 12,03 | 10,40 | 8,92 | 7,58 | 6,39 |
| Oscuro antes | 11,84 | 8,66 | 6,26 | 4,57 | 3,41 |
| Oscuro después | 11,84 | 9,88 | 8,18 | 6,75 | 5,59 |

La ponderación de la intensidad pasa de 68 % a 40 %. Solo la pantalla de resultados amplía su contenido. La matriz y el dendrograma ocupan 1582 px a 1920 y 1028 px a 1366. En móvil, ambos se desplazan dentro de su contenedor. En la revisión se detectó que la regla del ancho también alcanzaba al SVG del ícono de ayuda. Ahora se limita al gráfico; se retiró además su ancho máximo en línea para permitir que se ensanche.

Comandos ejecutados y resultado

- `pnpm --filter frontend exec vitest run src/styles/contraste-celdas.test.ts` → 2 fallos esperados antes y 10 pruebas pasan después.
- `pnpm --filter frontend test` → 83 archivos y 807 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- `pnpm --filter frontend exec vitest run src/features/card-sorting src/styles/contraste-celdas.test.ts` → 15 archivos y 145 pruebas pasan tras ajustar el ancho final del dendrograma.
- Chromium con PostgreSQL → matriz y dendrograma a 1920, 1366 y 375 px en ambos temas, sin desplazamiento horizontal de la página y con el ícono de ayuda dentro de su botón.

Pendientes: ninguno.
