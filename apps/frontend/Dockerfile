# syntax=docker/dockerfile:1

FROM node:24-alpine3.24 AS development

RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile

COPY apps/frontend ./apps/frontend
COPY packages/shared-types ./packages/shared-types

RUN pnpm --filter @observatorio-ux/shared-types build

EXPOSE 5173

# --host es necesario para que Vite escuche en 0.0.0.0 y sea alcanzable
# desde fuera del contenedor (por defecto solo escucha en localhost).
CMD ["pnpm", "--filter", "frontend", "dev", "--", "--host"]

FROM development AS build

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter frontend build

FROM nginx:1.30.4-alpine AS production

COPY apps/frontend/nginx.static.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
