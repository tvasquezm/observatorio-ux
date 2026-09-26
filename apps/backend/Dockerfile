# syntax=docker/dockerfile:1

FROM node:26-alpine3.24 AS development

# Usar la misma versión de pnpm fijada en el package.json del workspace
RUN apk add --no-cache openssl \
    && corepack enable \
    && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app

# Copiar archivos de configuración del workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Instalar dependencias respetando el lockfile
RUN pnpm install --frozen-lockfile

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

FROM development AS build

RUN pnpm --filter backend build

FROM node:26-alpine3.24 AS production

RUN apk add --no-cache openssl \
    && corepack enable \
    && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app

ENV NODE_ENV=production

# La imagen final conserva solo lo necesario para ejecutar Nest y Prisma.
# Prisma CLI se mantiene porque las migraciones se aplican en cada despliegue.
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY apps/backend/entrypoint.prod.sh ./apps/backend/entrypoint.prod.sh

RUN chmod +x apps/backend/entrypoint.prod.sh

EXPOSE 3000

ENTRYPOINT ["sh", "apps/backend/entrypoint.prod.sh"]
CMD ["node", "apps/backend/dist/src/main.js"]
