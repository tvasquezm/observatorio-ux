#!/bin/sh
set -e

# db ya está garantizado healthy por "depends_on: condition: service_healthy"
# en docker-compose.yml, así que no hace falta esperar aquí.

echo "==> Aplicando migraciones de Prisma..."
pnpm --filter backend exec prisma migrate deploy

echo "==> Corriendo seed..."
# seed.ts usa upsert() / findFirst+update-o-create, por lo tanto es seguro
# re-ejecutarlo en cada arranque. Si falla, dejamos que falle visiblemente.
pnpm --filter backend exec tsx prisma/seed.ts

echo "==> Iniciando backend..."
exec "$@"
