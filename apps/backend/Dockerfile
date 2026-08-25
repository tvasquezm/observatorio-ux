FROM node:20-alpine AS development

# Habilitar pnpm nativo de Node 20, fijando la versión que exige tu lockfile (9.0)
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copiar archivos de configuración del workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Instalar dependencias respetando el lockfile
RUN pnpm install

# Copiar el resto del código fuente
COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types
COPY apps/backend/prisma ./prisma

# Construir primero los tipos compartidos para evitar errores en el backend
RUN pnpm --filter @observatorio-ux/shared-types build

# Generar el cliente de Prisma (pnpm bloquea postinstall scripts por defecto)
RUN pnpm --filter backend exec prisma generate

RUN chmod +x apps/backend/entrypoint.sh

ENTRYPOINT ["sh", "apps/backend/entrypoint.sh"]
CMD ["pnpm", "--filter", "backend", "start:dev"]
