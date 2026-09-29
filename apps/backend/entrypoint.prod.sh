#!/bin/sh
set -e

echo "==> Aplicando migraciones de Prisma..."
pnpm --filter backend exec prisma migrate deploy

echo "==> Iniciando backend en modo producción..."
exec "$@"
