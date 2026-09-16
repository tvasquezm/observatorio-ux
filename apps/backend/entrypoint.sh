#!/bin/sh
set -e
# Este archivo debe conservar finales de línea LF; `.gitattributes` lo garantiza.
# db ya está garantizado healthy por "depends_on: condition: service_healthy"
# en docker-compose.yml, así que no hace falta esperar aquí.

echo "==> Aplicando migraciones de Prisma..."
pnpm --filter backend exec prisma migrate deploy

# El volumen de node_modules de desarrollo puede sobrevivir a una imagen nueva.
# Regenerar aquí mantiene el cliente sincronizado con schema.prisma en cada arranque.
echo "==> Generando cliente de Prisma..."
pnpm --filter backend exec prisma generate

# El seed modifica cuentas y datos demo: debe solicitarse explícitamente.
# Reiniciar Docker no debe restablecer contraseñas ni proyectos guardados.
if [ "$NODE_ENV" != "production" ] && [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "==> Corriendo seed de desarrollo solicitado..."
  pnpm --filter backend exec tsx prisma/seed.ts
else
  echo "==> Se conserva la base existente, sin seed automático."
fi

echo "==> Iniciando backend..."
exec "$@"
