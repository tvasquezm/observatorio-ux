# Pruebas de carga k6 — comandos en orden

Objetivo: 200 usuarios simultáneos. Dos pasadas:

- **Capacidad:** throttle de Nest y `limit_req` de nginx apagados. Mide el servidor.
- **Realista:** todo como en producción. Mide el efecto de que un curso comparta IP (NAT).

Todos los comandos son para **PowerShell** en Windows 11, ejecutados en la raíz del repo salvo que se diga otra cosa.

---

## 0. Antes de empezar

- Notebook enchufado, modo "Máximo rendimiento".
- Cerrar navegador, IDE y todo lo que no se necesite.
- Docker Desktop abierto.
- Versión de Compose (necesita 2.24.4 o superior):

```powershell
docker compose version
```

- Instalar k6 (en Windows, no en un contenedor):

```powershell
winget install k6 --source winget
k6 version
```

Cierra y abre la terminal después de instalar.

---

## 1. Limitar WSL2 (una sola vez)

Deja 10 GB y 8 hilos a Docker; quedan 6 GB y 4 hilos para Windows y k6.

```powershell
notepad $env:USERPROFILE\.wslconfig
```

Contenido del archivo:

```ini
[wsl2]
memory=10GB
processors=8
swap=2GB
```

Aplicar:

```powershell
wsl --shutdown
```

Abre Docker Desktop de nuevo y espera a que arranque. Comprobar:

```powershell
docker info --format "{{.NCPU}} CPUs, {{.MemTotal}} bytes"
```

Esperado: `8 CPUs` y unos 10 GB.

---

## 2. Aplicar los archivos

Extraer el paquete en la raíz del repo (ajusta la ruta de Descargas si hace falta):

```powershell
tar -xzf $env:USERPROFILE\Downloads\k6-docker.tar.gz
```

Después **reemplaza `docker-compose.loadtest.yml`** por la última versión que te envié (la que trae `cpus` y `mem_limit`). No uses `k6-carga.tar.gz`: quedó reemplazado.

Comprobar que quedó la versión con límites (deben salir 3 líneas):

```powershell
Select-String -Path docker-compose.loadtest.yml -Pattern mem_limit
```

Archivos que quedan:

- `apps/backend/src/app.module.ts` (modificado)
- `docker-compose.loadtest.yml` (nuevo)
- `tests/load/participante.k6.js` (modificado)
- `tests/load/evaluador.k6.js`, `tests/load/mixto.k6.js` (nuevos)
- `tests/load/lib/config.js`, `fases.js`, `metricas.js` (nuevos)

---

## 3. Revisar tipos del backend

```powershell
cd apps\backend
pnpm exec tsc --noEmit
cd ..\..
```

Debe terminar sin errores. Si falla, no sigas y envíame el error.

---

## 4. Crear `.env.loadtest`

```powershell
Copy-Item env.production.example .env.loadtest
notepad .env.loadtest
```

Reemplaza todos los `change_me`:

| Variable | Qué poner |
|---|---|
| `POSTGRES_PASSWORD` | Clave nueva (solo letras y números) |
| `DATABASE_URL` | La misma clave de arriba; mantén `connection_limit=20&pool_timeout=20` |
| `JWT_SECRET` | 32 caracteres o más |
| `JWT_PARTICIPANTE_SECRET` | 32 caracteres o más, **distinto** de `JWT_SECRET` |
| `SEED_PASSWORD`, `SEED_PROFESOR_PASSWORD`, `SEED_ADMIN_PASSWORD` | Claves nuevas |
| `CORS_ORIGIN` | `http://localhost:8080` |

Generar una clave aleatoria de 40 caracteres (úsalo una vez por cada secreto):

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

`.env.*` está en `.gitignore`: este archivo no se sube al repo.

---

## 5. Atajos (repetir en cada terminal nueva)

```powershell
function dc  { docker compose --env-file .env.loadtest -f docker-compose.production.yml -f docker-compose.loadtest.yml @args }
function dcr { docker compose --env-file .env.loadtest -f docker-compose.production.yml @args }
```

- `dc` = pasada de **capacidad** (con el override).
- `dcr` = pasada **realista** (producción tal cual).

---

## 6. Levantar el stack (pasada de capacidad)

La primera vez el build tarda varios minutos.

```powershell
dc up -d --build
dc ps
curl.exe http://localhost:8080/api/health
```

Espera a que `db`, `backend`, `frontend` y `nginx` estén `healthy`. Si algo falla:

```powershell
dc logs backend --tail 60
```

Verificar que el override quedó aplicado:

```powershell
dc exec backend printenv LOAD_TEST
dc exec nginx grep limit_req /etc/nginx/conf.d/default.conf
```

Esperado: `true`, y dos líneas con `rate=10000r/s` y `burst=10000`.

---

## 7. Cargar el seed (una vez por BD nueva)

Usa las mismas claves de `.env.loadtest`:

```powershell
dc exec -e SEED_PASSWORD=<clave> -e SEED_PROFESOR_PASSWORD=<clave> -e SEED_ADMIN_PASSWORD=<clave> backend pnpm run seed
```

---

## 8. Variables para k6 (repetir en cada terminal nueva)

```powershell
$env:BASE_URL = "http://localhost:8080"
$env:PROYECTO_ID = "f1e1b6a1-0001-4a11-9c00-000000000002"
$env:ESTUDIO_ID = "f1e1b6a1-0002-4a11-9c00-000000000003"
$env:EVAL_EMAIL = "profesor@test.com"
$env:EVAL_PASSWORD = "<SEED_PROFESOR_PASSWORD>"
$env:ADMIN_EMAIL = "admin@test.com"
$env:ADMIN_PASSWORD = "<SEED_ADMIN_PASSWORD>"
mkdir $env:USERPROFILE\k6-resultados
```

Los IDs son los del seed demo. Los resultados se guardan fuera del repo.

---

## 9. Pasada de capacidad, fase por fase

**Terminal 2:** déjala abierta mientras corre cada fase y anota el pico de CPU y memoria de `db`, `backend` y `nginx`.

```powershell
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

**Terminal 1:** ejecuta las fases **en este orden**. Si una falla sus umbrales, **detente** y envíame los resultados antes de seguir.

| # | Fase | Duración | Comando | Pasa si |
|---|---|---|---|---|
| 1 | Smoke | 1 min | `k6 run -e FASE=smoke --summary-export=$env:USERPROFILE\k6-resultados\smoke.json tests/load/mixto.k6.js` | 0 % errores |
| 2 | Baseline | 3 min | `k6 run -e FASE=baseline --summary-export=$env:USERPROFILE\k6-resultados\baseline.json tests/load/mixto.k6.js` | p95 < 300 ms |
| 3 | Load 25 VUs | 3 min | `k6 run -e FASE=load25 --summary-export=$env:USERPROFILE\k6-resultados\load25.json tests/load/mixto.k6.js` | p95 < 500 ms, errores < 1 % |
| 4 | Load 50 VUs | 3 min | `k6 run -e FASE=load50 --summary-export=$env:USERPROFILE\k6-resultados\load50.json tests/load/mixto.k6.js` | p95 < 500 ms, errores < 1 % |
| 5 | Load 100 VUs | 3 min | `k6 run -e FASE=load100 --summary-export=$env:USERPROFILE\k6-resultados\load100.json tests/load/mixto.k6.js` | p95 < 500 ms, errores < 1 % |
| 6 | Load 150 VUs | 3 min | `k6 run -e FASE=load150 --summary-export=$env:USERPROFILE\k6-resultados\load150.json tests/load/mixto.k6.js` | p95 < 500 ms, errores < 1 % |
| 7 | Load 200 VUs | 3 min | `k6 run -e FASE=load200 --summary-export=$env:USERPROFILE\k6-resultados\load200.json tests/load/mixto.k6.js` | p95 < 500 ms, errores < 1 % |
| 8 | Stress | 11 min | `k6 run -e FASE=stress --summary-export=$env:USERPROFILE\k6-resultados\stress.json tests/load/mixto.k6.js` | Se busca el punto de quiebre |
| 9 | Spike (200 participantes) | 3,5 min | `k6 run -e FASE=spike --summary-export=$env:USERPROFILE\k6-resultados\spike.json tests/load/participante.k6.js` | p95 < 800 ms, errores < 1 % |
| 10 | Soak | 33 min | `k6 run -e FASE=soak --summary-export=$env:USERPROFILE\k6-resultados\soak.json tests/load/mixto.k6.js` | Sin degradación |

Notas:

- Los peldaños de Load se corren **uno por uno**: entre cada uno revisa `docker stats` y sube solo si el anterior pasó. (`FASE=load` corre los cinco seguidos, 15,5 min; no lo uses para la primera vuelta.)
- El Spike corre solo el flujo del participante, con los 200 VUs.
- `soak` es la fase más exigente para el notebook. Si se calienta mucho, córtala con `Ctrl+C` y anótalo.
- Código de salida 99 de k6 = se cruzó un umbral (no es un fallo del script).

---

## 10. Pasada realista

Reinicia con una BD limpia y **sin** el override: throttle de Nest y `limit_req` de nginx activos.

> **Ojo:** `down -v` borra el volumen `postgres_production_data` de este stack. Es la BD de pruebas; no lo hagas si guardas algo ahí.

```powershell
dc down -v
dcr up -d --build
dcr ps
dcr exec -e SEED_PASSWORD=<clave> -e SEED_PROFESOR_PASSWORD=<clave> -e SEED_ADMIN_PASSWORD=<clave> backend pnpm run seed
```

Spike de participantes desde una sola IP:

```powershell
k6 run -e FASE=spike --summary-export=$env:USERPROFILE\k6-resultados\realista-spike.json tests/load/participante.k6.js
```

**Se esperan** muchos 429 (throttle de Nest) y 503 (nginx). Eso es el hallazgo del NAT, no una falla de la prueba. Mira `http_req_failed` y qué checks fallan (`join`, `results`).

---

## 11. Limpieza

```powershell
dcr down -v
```

Opcional: borrar `%USERPROFILE%\.wslconfig` y ejecutar `wsl --shutdown`.

---

## 12. Qué enviarme por cada fase

1. El bloque final del resumen de k6 (`http_req_duration` p95, `http_req_failed`, `checks`, `flow_errors`, `iterations`).
2. El pico de CPU y memoria de `db`, `backend` y `nginx` (de `docker stats`).
3. Si hubo errores: `dc logs backend --tail 100`.

---

## Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `Falta PROYECTO_ID` / `Falta EVAL_EMAIL` | Variables no definidas en esta terminal | Repite el paso 8 |
| `Login falló ... HTTP 401` | Clave distinta de la del seed | Usa la de `SEED_PROFESOR_PASSWORD` / `SEED_ADMIN_PASSWORD` |
| `Login falló ... HTTP 429` | `LOAD_TEST` no llegó al backend | Repite las verificaciones del paso 6 |
| Muchos 429 en la pasada de capacidad | `LOAD_TEST` no aplicado, o tope por hora | `dc exec backend printenv LOAD_TEST` |
| Muchos 503 en la pasada de capacidad | El `sed` de nginx no se aplicó | `dc exec nginx grep limit_req /etc/nginx/conf.d/default.conf` |
| `connection refused` | Stack no está `healthy` | `dc ps` y `dc logs backend --tail 60` |
| `dial: too many open files` / `cannot assign requested address` | Límites del sistema | Baja los VUs y avísame |
| Error por `!override` al hacer `dc` | Compose antiguo | Actualiza Docker Desktop |
