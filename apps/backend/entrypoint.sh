#!/bin/sh
set -e
# db ya está garantizado healthy por "depends_on: condition: service_healthy"
# en docker-compose.yml, así que no hace falta esperar aquí.

echo "==> Aplicando migraciones de Prisma..."
pnpm --filter backend exec prisma migrate deploy

# El seed usa upsert() con una password hardcodeada (Demo1234!) — es correcto
# y seguro re-ejecutarlo en cada arranque DE DESARROLLO, pero jamás debe
# correr contra una base de producción: resetearía silenciosamente la
# contraseña de un usuario real a un valor público y conocido por cualquiera
# que lea el repo. Se gatea explícitamente por NODE_ENV, con el mismo
# criterio que ya se usa para /auth/test-token (ver A4 en la auditoría /
# docs/ARCHITECTURE.md).
if [ "$NODE_ENV" = "production" ]; then
  echo "==> NODE_ENV=production: se omite el seed automático."
else
  echo "==> Corriendo seed (NODE_ENV=$NODE_ENV)..."
  pnpm --filter backend exec tsx prisma/seed.ts
fi

echo "==> Iniciando backend..."
exec "$@"
