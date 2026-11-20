# FASE F12: Foco visible y movimiento reducido

Estado: hecha.

Archivos tocados: `apps/frontend/src/styles/theme.css`, `tests/e2e/responsive.spec.ts`, este cierre y seis capturas en [FASE_F12_capturas](FASE_F12_capturas/).

El foco usa un anillo opaco. En movimiento reducido cesan las animaciones decorativas y se conservan transiciones breves de estado.

| Tema | Fondo | Superficie | Superficie atenuada |
|---|---:|---:|---:|
| Claro | 7,06:1 | 7,72:1 | 6,82:1 |
| Oscuro | 6,47:1 | 5,76:1 | 4,62:1 |

Comandos ejecutados y resultado

- Chromium con PostgreSQL de pruebas → Tab muestra un anillo sólido de 3 px en Card Sorting, Salas y Proyectos, en claro y oscuro. Los contrastes se calcularon con los tokens efectivos del navegador.
- `rg -n '\.01ms|outline:.*transparent|#3049b24d' apps/frontend/src/styles/theme.css` → sin coincidencias.
- `pnpm test:e2e tests/e2e/responsive.spec.ts` → 6 pruebas pasan, incluidas las dos de movimiento reducido.
- `pnpm test:e2e` en la primera corrida → 26 pasan y 2 fallan al entrar al acuerdo de heurística. La caché de dependencias de Vite no incluía la exportación `redactorDe`. Se volvió a compilar el paquete compartido y se reinició Vite con `--force`.
- `prisma migrate deploy` aplicó las 26 migraciones sobre PostgreSQL 16 vacío. Esto incluye la migración de F9.

Cambios respecto al plan: se agregó la prueba de movimiento reducido al archivo E2E responsivo.
