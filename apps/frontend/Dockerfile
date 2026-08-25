FROM node:20-alpine AS development

RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install

COPY apps/frontend ./apps/frontend
COPY packages/shared-types ./packages/shared-types

RUN pnpm --filter @observatorio-ux/shared-types build

EXPOSE 5173

# --host es necesario para que Vite escuche en 0.0.0.0 y sea alcanzable
# desde fuera del contenedor (por defecto solo escucha en localhost).
CMD ["pnpm", "--filter", "frontend", "dev", "--", "--host"]
