# FASE F13: Pestañas de resultados y texto mínimo

Estado: hecha.

Archivos tocados: `apps/frontend/src/styles/theme.css`, este cierre y dos [capturas de Chromium](FASE_F13_capturas/).

- Antes y después, las siete pestañas medían su ancho a 375 px con texto de 24 px (150 %). El desplazamiento queda dentro del carril y la captura muestra el indicador en el extremo. Se verificó en claro y oscuro, con datos de PostgreSQL.
- Contraste medido con texto y fondo efectivos de la pestaña inactiva: 6,91:1 en claro y 9,31:1 en oscuro.
- Las cinco insignias o etiquetas bajo 12 px subieron a `0.75rem`. La revisión de declaraciones absolutas de `font-size` confirma un mínimo de 12 px.

Comandos ejecutados y resultado

- `pnpm --filter frontend test` → 82 archivos y 797 pruebas pasan.
- `pnpm --filter frontend build` → salida 0.
- `pnpm test:e2e` → 28 pruebas pasan en escritorio y móvil, incluida la suite responsiva. Corrida con el paquete compartido compilado, la caché de Vite regenerada y PostgreSQL 16 local.

Cambios respecto al plan: no se reprodujo el solape. Se conservó el carril existente, según el paso 1. Pendientes: ninguno.
