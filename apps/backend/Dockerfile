# syntax=docker/dockerfile:1

FROM node:24-alpine3.24 AS development

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

FROM node:24-alpine3.24 AS production

RUN apk add --no-cache openssl \
    && corepack enable \
    && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app

ENV NODE_ENV=production

# H7 (auditoría 2026-09-24): antes se copiaba el node_modules completo de
# la etapa `build` (que instaló con devDependencies incluidas: jest,
# ts-jest, typescript, @nestjs/testing, etc. — innecesario y más superficie
# en la imagen final). Ahora se instala de nuevo, solo producción, directo
# en esta imagen (que además es la misma base que `build`, evitando
# problemas de compatibilidad de binarios nativos como bcrypt).
# prisma, tsx y dotenv están en "dependencies" (no dev) a propósito: se
# necesitan en producción para `prisma migrate deploy` (entrypoint) y para
# poder correr `pnpm run bootstrap:admin` / `pnpm run seed` manualmente.
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY apps/backend/entrypoint.prod.sh ./apps/backend/entrypoint.prod.sh

# H7 fix: el pnpm install --prod de arriba dispara el postinstall de
# @prisma/client antes de que el schema exista en esta etapa (recién se
# copia una línea más arriba) — deja instalado el cliente genérico, sin
# los enums/modelos del schema real (ej. TipoArtefacto queda undefined y
# revienta @IsEnum en artifacts.dto.ts al arrancar). Se genera explícito
# acá, ya con el schema real disponible.
RUN pnpm --filter backend exec prisma generate

RUN chmod +x apps/backend/entrypoint.prod.sh \
    && chown -R node:node /app

EXPOSE 3000

# H7: no correr como root en producción.
USER node

ENTRYPOINT ["sh", "apps/backend/entrypoint.prod.sh"]
CMD ["node", "apps/backend/dist/src/main.js"]