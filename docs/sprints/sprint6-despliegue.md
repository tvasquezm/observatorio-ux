# Sprint 6 — despliegue reproducible

Fecha de cierre técnico: 14 de septiembre de 2026.

## Alcance implementado

| Backlog | Estado verificable | Evidencia |
|---|---|---|
| F1. Dockerfile backend | Completo | Targets `development`, `build` y `production`; compila Nest, genera Prisma y aplica migraciones antes de arrancar. |
| F2. Dockerfile frontend | Completo | Vite genera archivos estáticos y Nginx los sirve con fallback para rutas de la SPA. |
| F3. Docker Compose completo | Completo | `docker-compose.production.yml` orquesta `db`, `backend`, `frontend` y `nginx`, todos con healthcheck. |
| F4. Reverse proxy Nginx | Completo | Un solo origen: `/api/*` va al backend y el resto al frontend. |
| F5. Variables de entorno | Completo | `env.production.example` documenta puerto, PostgreSQL, JWT y CORS sin incluir secretos reales. |
| F6. Guía de instalación | Completo | Procedimiento desde cero, verificación, operación, respaldo y actualización en este documento. |
| F7. Prueba limpia | Completo | Despliegue desde volumen vacío probado localmente y job `deployment-smoke` agregado a GitHub Actions. |
| F8. Documentación | Completo | README, arquitectura, changelog y registro oficial del sprint actualizados. |
| R6. Reunión con profesor | Pendiente externo | No existe un acta verificable; se mantiene en `docs/dudas-profesor.md`. |

## Arquitectura de despliegue

```text
Navegador :8080
       │
       ▼
     Nginx
      ├── /api/* ──► NestJS :3000 ──► PostgreSQL :5432
      └── /*     ──► Nginx estático :80
```

Solo el proxy publica un puerto en el host. PostgreSQL, el backend y el
servidor estático permanecen dentro de la red privada de Compose.

## Instalación desde cero

### Requisitos

- Git.
- Docker Engine o Docker Desktop con Docker Compose v2.
- Un dominio y terminación HTTPS para un despliegue público real.

No se necesita instalar Node.js ni pnpm en el servidor si se usa Docker.

### 1. Clonar y preparar el entorno

```bash
git clone https://github.com/tvasquezm/observatorio-ux.git
cd observatorio-ux
cp env.production.example .env.production
```

En PowerShell, el último comando es:

```powershell
Copy-Item env.production.example .env.production
```

Editar `.env.production` antes de levantar el sistema:

- Reemplazar ambos valores `change_me` de JWT por secretos largos, aleatorios
  y diferentes entre sí.
- Reemplazar `POSTGRES_PASSWORD` y repetir exactamente ese valor dentro de
  `DATABASE_URL`. Si contiene caracteres reservados, codificarlos para URL.
- Cambiar `CORS_ORIGIN` al origen público exacto, por ejemplo
  `https://observatorio.ejemplo.cl`, sin `/` final.
- Cambiar `APP_PORT` si el puerto 8080 ya está ocupado.

Ejemplo para generar secretos en Linux/macOS:

```bash
openssl rand -hex 32
```

En PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

### 2. Validar y levantar

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build --wait --wait-timeout 180
```

El backend ejecuta `prisma migrate deploy` de forma automática antes de
arrancar. Nunca ejecuta el seed de demostración en producción.

### 3. Verificar

Con `APP_PORT=8080`:

```bash
curl --fail http://localhost:8080/nginx-health
curl --fail http://localhost:8080/api/health
curl --fail http://localhost:8080/
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Los cuatro servicios deben aparecer `healthy`. Una ruta de la SPA abierta
directamente también debe devolver la aplicación, no un 404.

## Operación

Ver logs:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f --tail=200
```

Actualizar a un commit nuevo:

```bash
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build --wait --wait-timeout 180
```

Respaldar PostgreSQL antes de una actualización importante:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > observatorio-ux.sql
```

Detener sin borrar datos:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml down
```

`down -v` elimina también el volumen de PostgreSQL y, por tanto, sus datos.
Usarlo solo para una prueba desechable o después de contar con un respaldo.

## Seguridad de publicación

La aplicación usa cookies `Secure` para la sesión del evaluador cuando
`NODE_ENV=production`; por eso el acceso público debe usar HTTPS. Este Compose
expone HTTP para funcionar detrás de un balanceador o proxy TLS administrado.
No se deben versionar `.env.production`, respaldos SQL ni secretos reales.

## Validación automatizada

El job `deployment-smoke` de `.github/workflows/ci.yml` crea el stack completo
en un runner vacío, espera sus healthchecks, consulta Nginx, la API y el
frontend, y finalmente elimina contenedores y volumen aunque falle un paso.
Así, cada push vuelve a comprobar F1–F7 en condiciones reproducibles.
