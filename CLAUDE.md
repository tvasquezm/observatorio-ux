# Observatorio UX: guía para el agente

Monorepo pnpm: `apps/frontend` (React 19 + Vite + vitest), `apps/backend` (NestJS + Prisma 7 + Postgres, Jest), `packages/shared-types` (tipos y catálogo heurístico compartidos), E2E con Playwright en `tests/e2e`. Rama de trabajo actual: `codex/plan-fases-unificado` (producción despliega `main`: frontend en Vercel, backend en Render plan gratuito).

## Comandos verificados

```bash
# Tipos compartidos (rehacer tras tocar packages/shared-types)
pnpm --filter @observatorio-ux/shared-types build

# Frontend: tests focales primero; la suite completa una vez antes del commit
cd apps/frontend
DEBUG_PRINT_LIMIT=0 pnpm exec vitest run <archivos o carpeta> --maxWorkers=2 --reporter=dot
pnpm exec tsc --noEmit          # tipos (el build es tsc + vite build)

# Backend: en serie (en paralelo algunas suites fallan al arrancar en Windows)
cd apps/backend
node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand <ruta opcional>
pnpm exec tsc --noEmit -p tsconfig.json   # los 8 errores en *.spec.ts de heuristica-flujo ya existían

# Prisma (desde apps/backend)
npx prisma generate && npx prisma migrate deploy
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script   # vacío = sin desfase

# E2E (levanta backend 3001 y frontend 5174 solo; necesita la base)
docker compose up -d db          # Postgres en localhost:5434 (Docker Desktop debe estar abierto)
unset DATABASE_URL && pnpm exec playwright test [tests/e2e/<spec>]   # completo ~2 min
```

- `npx tsc` no funciona: usar `pnpm exec tsc`.
- Usuario de prueba del seed (solo local): `profesor@test.com` (ver `tests/e2e/helpers.ts`).
- Stack completo de desarrollo: `docker compose up -d` (frontend en 5173). Vite dentro de Docker no detecta cambios del disco de Windows: `docker compose restart frontend` para ver cambios.
- El contenedor `observatorio-ux-loadtest-*` es de pruebas de carga del usuario: no tocarlo.

## Particularidades que causan reintentos

- **Saltos de línea CRLF** en muchos archivos: al reemplazar texto con scripts, normalizar a `\n`, editar y restaurar el salto original. El editor de archivos lo maneja solo.
- **No editar código con plantillas de texto (`` `...${x}` ``) desde Bash** (heredoc o `node -e`): Bash rompe los acentos graves. Usar el editor de archivos o escribir un archivo completo.
- **Nombres accesibles con `sr-only`:** escribir `{' '}<span className="sr-only">de {x}</span>`; un espacio al inicio dentro del span no cuenta y los tests no encuentran el botón.
- **Memoria:** con Docker corriendo, vitest puede quedarse sin memoria; usar `--maxWorkers=2` (o 1) y detener los contenedores que no se usan.
- **Fuentes externas:** antes de comparar contra una fuente, comprobar que se pueda abrir (inria.hal.science bloquea bots; tandfonline y ACM son de pago).
- **Ver PDFs:** no hay herramientas para convertirlos a imagen en este equipo; verificar con el test que genera el PDF real (`src/shared/utils/pdf-visual.test.ts`) y pedir revisión visual al usuario.

## Forma de trabajo acordada

- Responder en español. Hacer commits por fase con mensaje en español; **push solo cuando el usuario lo pida**.
- Plan vigente: `C:\Users\tmmsv\Downloads\PLAN_UNIFICADO_PENDIENTES.md` (leer solo ESTADO y la fase en curso).
- Microplan con aprobación solo para cambios de riesgo alto (autenticación, permisos, datos personales, migraciones destructivas). Lo visual o de bajo riesgo se ejecuta directo cuando el usuario pidió avanzar.
- Verificar con tests focales mientras se trabaja; suite completa + E2E una vez antes de cada commit.
- Catálogo heurístico: solo preguntas respaldadas por su fuente (`packages/shared-types/src/domains/heuristica-depuracion.ts`); los ids de pregunta no cambian.
