# FASE F10: Configuración, CSRF, límite de intentos y script de sesión en CI

Estado: hecha en local. Medición de producción pendiente.

Archivos tocados: `.github/workflows/ci.yml`, `apps/backend/scripts/check-session-refresh.mjs`, `apps/backend/src/common/csrf.ts`, `apps/backend/src/core/config/env.validation.ts`, `apps/backend/src/core/config/test/env.validation.smoke.spec.ts`, `docker-compose.production.yml`, `render.yaml` y este cierre. El cierre de la fase homónima del plan anterior queda en el historial Git.

- Las mutaciones con cookie de evaluador comprueban `Origin` antes de aplicar las exenciones. El middleware reutiliza el origen de la configuración de CORS. Las solicitudes sin cookie o sin `Origin` mantienen su flujo.
- El validador aplica la regla de duración a `JWT_PARTICIPANTE_EXPIRES_IN`. Compose pasa las tres variables solicitadas y el archivo de ejemplo ya documentaba sus valores.
- GitHub Actions compila el backend y ejecuta la verificación HTTP de sesión. El script comprueba origen con credenciales de prueba válidas, renovación, revocación y límite de intentos.

Comandos ejecutados y resultado

- `pnpm --filter backend build` → salida 0.
- `pnpm --filter backend test` → 27 suites y 396 pruebas pasan.
- `node apps/backend/scripts/check-session-refresh.mjs` → salida 0. Origen, CSRF, vencimiento, renovación limitada, atributos de cookie, revocación tras cerrar sesión y 429 pasan.
- Una copia temporal de la prueba formuló una sola solicitud en el bucle final. El resultado 200 produjo el fallo esperado `200 !== 429` y confirmó que el script detecta la ausencia de 429.
- `docker compose --env-file env.production.example -f docker-compose.production.yml config --quiet` → salida 0.
- `git diff --check` → salida 0.

Pendientes

- Verificar en Render que `CORS_ORIGIN` coincida con el origen público de Vercel. `TRUST_PROXY_HOPS` queda como variable de panel (`sync: false`) para ajustarla con la medición de `req.ip` desde dos clientes reales.
- Queda pendiente la ejecución del workflow remoto.
