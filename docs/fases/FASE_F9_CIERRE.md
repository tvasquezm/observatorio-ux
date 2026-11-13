# CIERRE FASE F9

Fecha: 2026-11-12

Hecho:
- Grises y separadores con contraste medido; se retira la opacidad que degradaba textos de resultados.
- InfoTip con nombre, title, icono de 1.25rem y área de 44 × 44 px. Técnicas con iconos/glifos de 1.5rem y sus nombres visibles.
- Enlaces, summaries, pestañas, etiquetas de checkbox/radio y botones superiores/de sala con áreas mínimas de 44 px.
- Tarjetas inválidas explican «Supera el límite», «Repetida» o «Texto largo». Se conservan mensajes, checkmarks y etiquetas existentes para completado/activo/error.
- Espacio entre proyectos, técnicas y secciones de sala mediante `--section-gap: 1.5rem`.

Archivos tocados: theme.css, InfoTip(.test).tsx, CardSortingChips(.test).tsx.

Contratos reales: `--icon-size-info: 1.25rem`, `--icon-size-technique: 1.5rem`. Icon acepta tamaño numérico y es decorativo por defecto; CSS adapta el tamaño a la preferencia de fuente. El botón «Faltan N fases» ya tenía área de 44 px mediante pseudo-elemento (18 + 13 + 13), que se conserva.

Inventario previo: 15 archivos de producto con Icon/InfoTip: menú, UI, tres páginas de técnicas, CardSortingPage y resultados, TechniqueProcess, Chips, Dendrogram, Entry, Progress y dos editores de heurística. Técnicas ya tienen nombres visibles; no se redibujan iconos. Los estados de chips eran el caso sin explicación visible.

Desvíos: los colores efectivos estaban repetidos en el bloque «Refinamiento visual 2026»; se corrigieron allí sin limpiar duplicados. La auditoría en navegador descubrió también reglas posteriores de 38 px en la cabecera y 34 px en las pestañas de sala; se corrigieron en su origen.

Verificación:
```text
Regresión: las nuevas pruebas fallan sin title/tamaño y textos de estado.
pnpm --filter frontend test InfoTip CardSortingChips ProjectMenu: verde
pnpm --filter frontend test: 72 archivos, 723 pruebas aprobadas
pnpm --filter frontend build: exit 0
Chromium: 64 combinaciones (4 pantallas × 2 anchos × 2 escalas × 4 modos).
Pantallas: detalle de proyecto, sala, ingreso y resultados.
375/1280 px, Normal/Huge, claro/oscuro/alto contraste claro/oscuro.
Resultado final: 0 grupos con clicables menores de 44 × 44 px.
```

Contraste (mínimo entre los cinco fondos de superficie; tabla completa en evidencias):

| Modo | Texto / fondo más exigente | Ratio | Borde / fondo más exigente | Ratio |
|---|---|---:|---|---:|
| Claro | #4c5b70 / #eef1f6 | 6.11 | #7c889b / #eef1f6 | 3.17 |
| Oscuro | #b9c5d8 / #263148 | 7.45 | #7889a3 / #263148 | 3.66 |
| Alto claro | #222222 / #eeeeee | 13.71 | #000000 / #eeeeee | 18.10 |
| Alto oscuro | #eeeeee / #222222 | 13.71 | #ffffff / #222222 | 15.91 |

Capturas / evidencia manual: `evidencias/F9`, ocho capturas claro/oscuro a 375/Huge, API simulada. Antes: bordes claros ~1.14:1 y textos grises sobre superficies ~4.12:1; después: mínimos de la tabla. Mayor separación de tarjetas y contornos definidos. Tipografía Normal sin cambios.

Pendientes: pestañas de resultados superpuestas a 375/Huge (registrado en F1, abordar al ampliar gráficos en F4). No se asegura contraste de cada ilustración ni se probó con lectores de pantalla o datos productivos.
