# FASE F19: Íconos de técnicas, información y modo claro

Estado: hecha.

Archivos tocados: `DashboardPage.tsx`, `ProjectOverviewPage.tsx` y sus pruebas, `theme.css`, `CHANGELOG.md`, el cierre y las [capturas comparativas](FASE_F19_capturas/).

Las cinco tarjetas de Inicio y del proyecto muestran los SVG de cada técnica. Los botones de ayuda mantienen un área mínima de 44 px y muestran un ícono de 1,5 rem. En claro, los bordes decorativos pasan a `#d7dde7` y los controles mantienen `#7c889b`.

Comandos ejecutados y resultado

- `pnpm --filter frontend exec vitest run src/pages/__tests__/DashboardPage.test.tsx src/pages/__tests__/ProjectOverviewPage.test.tsx` → dos fallos esperados antes de incorporar los SVG.
- `pnpm --filter frontend test` → 83 archivos y 808 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- `rg` de los cinco glifos antiguos en el código de producción → sin coincidencias.
- Chromium con PostgreSQL → en Inicio y en resultados se comprobó el color del borde del panel y del botón. Los bordes se mantienen en `#7889a3` en oscuro y en blanco en alto contraste oscuro. Los cambios de íconos se aplican también a esos temas.

Pendientes: ninguno.
