# Comandos de backend — dos flujos válidos

Ver también [`BACKEND.md`](./BACKEND.md) para el flujo recomendado (Docker,
sin instalar nada localmente). Esta guía es la alternativa para quien
prefiera correr el backend fuera de contenedores, con Node/pnpm instalados
en su máquina.

## Flujo A — Docker (recomendado, ver BACKEND.md)

```bash
cp .env.example .env
docker compose up --build
```

Levanta DB + backend + watch de `packages/shared-types`, con migraciones y
seed automáticos. No requiere Node.js ni pnpm locales.

Para levantar en segundo plano (sin quedarte pegado a los logs):

```bash
docker compose up -d
```

## Flujo B — Node/pnpm local (alternativa)

Requiere Node.js y pnpm instalados en tu máquina, y una base de datos
corriendo (por ejemplo, solo el servicio de DB vía
`docker compose up -d db`).

1. Encender el backend en modo watch:
```bash
   pnpm --filter backend start:dev
```
   Levanta la API en el puerto 3000 y recarga con cada cambio de archivo.

2. Encender Prisma Studio (visor de base de datos), en otra pestaña:
```bash
   pnpm --filter backend exec prisma studio
```
   Disponible en `http://localhost:5555`.

**Tip:** si el backend tira `EADDRINUSE :::3000`, liberar el puerto con:
```bash
npx kill-port 3000
```
