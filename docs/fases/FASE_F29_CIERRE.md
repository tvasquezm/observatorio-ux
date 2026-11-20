# FASE F29: Acceso rápido al tamaño del texto

Estado: hecha.

Archivos tocados: `AppLayout.tsx` y su prueba, `FontSizePicker.tsx`, `FontSizeQuickAccess.tsx`, `Icon.tsx`, `theme.css`, `CHANGELOG.md`, este cierre y cuatro [capturas](FASE_F29_capturas/).

El botón «Tamaño del texto» en la barra abre el mismo selector que Preferencias. Los cinco niveles y su almacenamiento son los mismos. Clic fuera o Escape cierra el panel. Escape devuelve el foco al botón.

Comandos ejecutados y resultado

- `pnpm --filter frontend exec vitest run src/layouts/AppLayout.test.tsx` → fallo esperado sin el botón y 18 pruebas pasan con el cambio.
- `pnpm --filter frontend test` → 83 archivos y 809 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- Chromium con PostgreSQL → panel dentro del viewport a 1366 px al 100 % y a 375 px al 150 %, en claro y oscuro. El botón mide al menos 44 × 44 px y el foco vuelve al cerrarlo con Escape.

Pendientes: ninguno.
