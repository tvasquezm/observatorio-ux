# Actualizar a esta versión (segregación evaluadorToken/participanteToken + bloqueo de edición a DOCENTE)

Breaking change: nueva env var obligatoria `JWT_PARTICIPANTE_SECRET`. El
backend no arranca sin ella (ver `CHANGELOG.md`).

## 1. Traer los cambios

```
git pull
pnpm install
```

## 2. Variables de entorno

Agregar `JWT_PARTICIPANTE_SECRET` (nunca igual a `JWT_SECRET`, mínimo 16
caracteres).

**Si ejecutas el proyecto localmente (sin Docker)** — edita `apps/backend/.env`:

```
echo JWT_PARTICIPANTE_SECRET=dev_only_change_me_participante_min_16 >> apps/backend/.env
```

**Si ejecutas el proyecto con Docker** — edita el `.env` de la raíz del repositorio:

```
echo JWT_PARTICIPANTE_SECRET=dev_only_change_me_participante_min_16 >> .env
```

(`JWT_PARTICIPANTE_EXPIRES_IN` es opcional, default `4h`.)

## 3. Reiniciar

Local:
```
pnpm --filter backend start:dev
```

Docker:
```
docker compose up -d --build backend
```

## 4. Verificar

```
pnpm --filter backend test auth.service
pnpm --filter frontend test MomentosCriticosPage
```

## 5. Migraciones

La segregación de tokens no agregó una migración propia. Sin embargo, el
repositorio actual sí contiene migraciones posteriores. En una instalación
nueva ejecuta `pnpm --filter backend exec prisma migrate deploy`; con Docker,
`entrypoint.sh` lo hace automáticamente al iniciar el backend.

## Qué cambió (por si el test falla por otra razón)

- `ArtifactsController`: DOCENTE ya no puede crear/editar/bloquear/eliminar
  artefactos (persona, journey-map, momentos-críticos), solo leerlos.
- Frontend: botones "Editar"/"Eliminar"/"Nuevo ..." ocultos para DOCENTE en
  Personas, Journey Map y Momentos Críticos (`shared/auth/permisos.ts`).
- `participanteToken` ahora se firma y valida con un secreto propio
  (`JWT_PARTICIPANTE_SECRET`), separado del de `evaluadorToken`.
