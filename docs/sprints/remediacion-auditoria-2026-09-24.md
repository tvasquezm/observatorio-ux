# Remediación auditoría 2026-09-24

No es un sprint numerado: cierre de los hallazgos de
`AUDITORIA_observatorio-ux.md` (seguridad, capas de request, capacidad para
~200 usuarios simultáneos) y del plan de rendimiento asociado. Detalle
completo, verificaciones y comandos en `docs/PLAN_REMEDIACION_AUDITORIA.md`;
este documento es el resumen de cierre.

**Corrección a la auditoría original:** H9 (acciones de GitHub sin fijar a
SHA) no aplicaba — las 5 acciones de `.github/workflows/ci.yml` ya estaban
fijadas a SHA. Solo queda vigente la otra mitad de H9 (puertos del compose de
desarrollo sin restringir a `127.0.0.1`), fuera de alcance por ser desarrollo,
no producción.

## Alcance implementado

| Fase | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| 1. Auth | H2, H4, H6 | Completo | Gate de `test-token` a `=== 'development'`; `registerParticipantConsent` exige `resumeToken`; login con hash dummy anti-timing, email normalizado, `MaxLength`. Frontend (`onboarding.api.ts`, `OnboardingPage.tsx`) ajustado para mandar `resumeToken` — brecha no prevista en el plan original. |
| 2. Seed y bootstrap | H3 | Completo | `seed.ts`/`seed-usuario.js` abortan en producción sin `SEED_*_PASSWORD` y dejan de loguear contraseñas; `bootstrap-admin.ts` nuevo. |
| 3. Docker | H7 | Completo | Etapa `production` corre como `USER node`, sin deps de desarrollo. `prisma`/`tsx`/`dotenv` movidos a `dependencies` (se usan en runtime); `pnpm-lock.yaml` regenerado. |
| 4. Nginx | H8 + rendimiento | Completo | `client_max_body_size 5m`; `limit_req` 20 r/s burst 60 por IP (subido del estándar por el caso de Sala = IP institucional compartida); `keepalive`/`proxy_http_version 1.1` en los upstreams; gzip. HSTS queda fuera: este nginx no termina TLS (deuda H1). |
| 5. Rendimiento `submitResult` | — | Completo | N+1 de categorías reemplazado por `findMany` + `Map`; `$transaction` con `maxWait`/`timeout` explícitos; `connection_limit`/`pool_timeout` en `DATABASE_URL`. 2 tests nuevos para la rama antes sin cobertura. |
| 6. Prueba de carga | — | Completo | `tests/load/participante.k6.js`: access → consent → join → results, rampa a 200 VUs, thresholds `http_req_failed<5%` y `p(95)<800ms`. Depende de la fase 5. |
| 7. Participantes anónimos | H5 | Completo | `proyectoId` en `Participante` (nullable, `ON DELETE SET NULL`); límite de 300/hora por proyecto (429) además del `@Throttle` por IP existente; job horario (`ParticipantesCleanupService`) que borra huérfanos sin consentimiento ni sesión. `ScheduleModule.forRoot()` agregado en `auth.module.ts` — no estaba en el plan original. |

## Verificación

Mismo bloqueo de red en todas las fases: sin acceso a `binaries.prisma.sh` no
se pudo correr `prisma generate`, y por lo tanto tampoco `jest`/`nest build`
reales del backend, ni `docker build` (no hay Docker en el sandbox). Lo que sí
se corrió y confirmó:

- Frontend (`vitest`): 36/36 verde (fase 1).
- Instalación `--prod --frozen-lockfile` replicada en directorio aparte:
  confirma que `prisma`/`tsx`/`dotenv`/`bcrypt` quedan y `jest`/`typescript`/
  `ts-jest`/`ts-node`/`supertest` no (fase 3).
- `nginx -t` con el `server{}` real dentro de un `http{}` mínimo, upstreams
  resueltos vía `/etc/hosts` (fase 4).
- `tsc --noEmit` del backend completo comparado línea por línea contra
  `orig`: únicos 3 errores nuevos son el mismo patrón de cascada por Prisma
  Client no generado que ya afecta al resto del archivo, ninguno de tipo
  distinto (fase 5).
- `tsc --noEmit` sobre los 5 `.ts` nuevos/modificados de la fase 7, sin
  errores de sintaxis; `@nestjs/schedule@12.0.2` confirmado compatible con
  `@nestjs/core`/`common` `^11` contra el registry de npm, no de memoria.
- Sintaxis del script k6 verificada (`node --check`, ESM), armado leyendo los
  DTOs/controller/service reales, no de memoria (fase 6).

Sin verificar contra un entorno real: `jest` del backend, `docker build`,
`limit_req`/`gzip` bajo carga real, y el propio script k6 contra un stack
levantado. Queda pendiente correr estas fases en un entorno con acceso a
`binaries.prisma.sh` y Docker antes de darlas por confirmadas en la práctica.

## Deuda técnica que queda abierta

**H1 — IP real detrás de proxy/TLS terminator.** No se cierra en este plan:
depende de una decisión de infraestructura (dónde se despliega en producción,
si hay proxy de la universidad de por medio) todavía no tomada. Con la
topología actual del compose (un solo nginx propio, sin proxy externo
delante) el sistema está bien — `trust proxy 1` asume un solo salto y hoy no
hay más que ese nginx. El riesgo aparece si se agrega un proxy/balanceador
externo sin ajustar `trust proxy`/`set_real_ip_from` a esa topología real.

## Pendiente (fuera de esta entrega)

Con las 7 fases cerradas, según `PLAN_REMEDIACION_AUDITORIA.md` corresponde:
agregar la entrada correspondiente en `docs/AUDIT_LOG.md`, y borrar ese
archivo de plan. Ninguna de las dos se hizo — un borrado de archivo requiere
aprobación explícita aparte, y la entrada de `AUDIT_LOG.md` es una decisión
de formato propia.
