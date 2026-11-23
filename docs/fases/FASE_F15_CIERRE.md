# FASE F15: Consolidar tokens y estilos

Estado: hecha.

Archivos tocados: `theme.css`, `AnilloAvance.tsx`, `EvidenciaEditor.tsx` y su prueba, `InformeView.tsx`, `MatrizItem.tsx`, `SalaDetallePage.tsx`, `JourneyMapPage.tsx`, `PersonasPage.tsx`, `ProjectParticipantsPage.tsx`, `CHANGELOG.md`, este cierre y las [capturas](FASE_F15_capturas/).

Hay un bloque principal para claro y uno para oscuro. La comparación de valores efectivos añade solo `--annotation` en ambos. El editor usa ese token para inicializar el color. Se retiraron 26 declaraciones JSX en línea, de 43 a 17. Las medidas físicas de los elementos conservan sus valores también al cambiar el tamaño de fuente.

Estilos que siguen en línea por depender de datos

- Siete porcentajes de barras o distribuciones en analítica, Card Sorting y Momentos críticos.
- Tres valores de tamaño, texto y opacidad del anillo de avance.
- Tres valores de dimensiones, posiciones y tonos en Journey Map.
- Dos variables con el color de Chips y SalaBadge.
- Dos estilos con el cursor de un tirador y el color elegido de una anotación. La intensidad de la matriz también depende de los datos y se calcula como antes.

Comandos ejecutados y resultado

- Comparación de tokens antes y después → solo difiere `--annotation`.
- `rg -n -F '#d83232' apps/frontend/src` → dos declaraciones del token, ambas en `theme.css`.
- `pnpm --filter frontend test` → 87 archivos y 822 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- Chromium a 1366 × 768, claro y oscuro → cinco pares de capturas idénticos. En Inicio oscuro difieren 20 de 1.049.088 píxeles en el borde de la ilustración. La inspección visual conserva la misma apariencia y la comparación de tokens confirma los mismos colores efectivos.

Pendientes: ninguno.
