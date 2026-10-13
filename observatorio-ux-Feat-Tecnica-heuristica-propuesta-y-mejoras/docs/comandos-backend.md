# Comandos de backend — flujo sin Docker

Para el flujo recomendado (Docker, sin instalar nada localmente) ver
[`BACKEND.md`](./BACKEND.md). Para el listado completo de comandos del
proyecto (Docker, tests, troubleshooting, seed) con el caso de uso de cada
uno, ver [`COMANDOS.md`](./COMANDOS.md).

Esta guía cubre la alternativa: correr el backend fuera de contenedores,
con Node/pnpm instalados en tu máquina.

## Flujo B — Node/pnpm local

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
