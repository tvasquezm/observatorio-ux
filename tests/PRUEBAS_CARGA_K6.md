# Pruebas de carga con k6

k6 simula usuarios que envían peticiones HTTP a la API. Estos scripts no abren
navegadores. El objetivo es verificar tiempos de respuesta y errores hasta
200 usuarios simultáneos; `stress` llega a 300 para buscar el punto de quiebre.

Hay dos pasadas:

- **Capacidad:** se desactiva el throttle y se eleva el límite de nginx para
  medir el servidor. Solo en el proyecto Docker de pruebas.
- **Realista:** se conservan los límites de producción para medir el efecto
  de muchos participantes conectados desde una misma IP.

Los scripts descartan los cuerpos de respuesta que no necesitan. Conservan
únicamente los JSON necesarios para continuar el flujo. Los logins de evaluador
y admin usan cookie jars independientes y mantienen la protección CSRF.

## 1. Requisitos y RAM

Usa PowerShell en Windows, desde la raíz del repositorio. Necesitas Docker Desktop,
Docker Compose >= 2.24.4, Node.js >= 24, pnpm 10.34.5 y k6. Para instalar k6:

```powershell
winget install k6 --source winget
k6 version
docker compose version
```

La comprobación automática en CI usa k6 2.3.0. No necesitas instalar Grafana,
Prometheus ni navegadores para correr estos scripts.

La RAM de k6 y la de Docker son consumos distintos. No atribuyas todo el consumo
de `VmmemWSL` a k6. El override limita PostgreSQL a 2 GB, backend a 1 GB y nginx
a 256 MB; faltan frontend y el gasto de WSL/Docker. Son **topes**, no cantidades
que cada servicio necesariamente consuma. Los builds pueden tener otro pico.

En un equipo de 16 GB, prueba primero sin modificar WSL. Si necesitas limitarlo,
este es un punto de partida opcional en `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
memory=6GB
processors=6
swap=2GB
```

El límite de WSL tampoco reserva esos 6 GB al arrancar. Ajusta según mediciones.
Aplicarlo con `wsl --shutdown` detiene todas las distribuciones WSL; después
reinicia Docker Desktop. No se requiere hacerlo para ejecutar la prueba.

Durante una fase, observa k6 en el Administrador de tareas y, en otra terminal:

```powershell
docker stats
```

Si la máquina empieza a paginar intensamente o el generador satura la CPU,
los tiempos ya mezclan el límite del equipo de pruebas con el de la aplicación.
Anótalo y detén la fase; no lo presentes como capacidad del servidor. Para una
medición de capacidad más fiel, ejecuta k6 en otro equipo contra el stack de pruebas.

Referencias: [RAM y optimización de k6](https://grafana.com/docs/k6/latest/testing-guides/running-large-tests/).

## 2. Preparar una BD y un puerto exclusivos de pruebas

```powershell
Copy-Item env.production.example .env.loadtest
notepad .env.loadtest
```

Modifica las siguientes variables:

| Variable | Valor |
|---|---|
| `APP_PORT` | `8081` para no ocupar el puerto productivo `8080` |
| `POSTGRES_DB` | `observatorio_ux_loadtest` |
| `POSTGRES_PASSWORD` | Una contraseña propia para pruebas |
| `DATABASE_URL` | Mismo usuario/contraseña y BD; host `db`; conserva `schema=public&connection_limit=20&pool_timeout=20` |
| `JWT_SECRET`, `JWT_PARTICIPANTE_SECRET` | Secretos distintos de al menos 32 caracteres |
| `CORS_ORIGIN` | `http://localhost:8081` |
| `SEED_PASSWORD`, `SEED_PROFESOR_PASSWORD`, `SEED_ADMIN_PASSWORD` | Contraseñas propias para los usuarios demo |

`.env.loadtest` está ignorado por Git. No subas credenciales ni resultados con datos sensibles.

Define estos atajos en cada terminal nueva. **Ambos usan el proyecto aislado
`observatorio-ux-loadtest`**, incluso cuando se omite el override:

```powershell
function dc  { docker compose -p observatorio-ux-loadtest --env-file .env.loadtest -f docker-compose.production.yml -f docker-compose.loadtest.yml @args }
function dcr { docker compose -p observatorio-ux-loadtest --env-file .env.loadtest -f docker-compose.production.yml @args }
```

`dc` mide capacidad; `dcr` conserva los controles productivos. El nombre del
proyecto separa contenedores y volumen de `observatorio-ux-production`.

## 3. Levantar y sembrar el stack de capacidad

```powershell
dc config --quiet
dc up -d --build --wait --wait-timeout 180
dc ps
curl.exe --fail http://localhost:8081/api/health
```

Si falla, revisa `dc logs backend --tail 60`. Confirma el override:

```powershell
dc exec backend printenv LOAD_TEST
dc exec nginx grep limit_req /etc/nginx/conf.d/default.conf
```

Debe aparecer `true`, `rate=10000r/s` y `burst=10000`. No ejecutes k6 hasta que
los servicios estén healthy. Carga el seed una vez por BD nueva usando las
contraseñas de `.env.loadtest`:

```powershell
dc exec -e SEED_PASSWORD=<clave> -e SEED_PROFESOR_PASSWORD=<clave> -e SEED_ADMIN_PASSWORD=<clave> backend pnpm run seed
```

El seed modifica cuentas y datos demo; usa exclusivamente la BD de pruebas.
El pool conserva los parámetros de DATABASE_URL tanto en el backend como en el seed.

## 4. Variables y comprobación rápida

```powershell
$env:BASE_URL = 'http://localhost:8081'
$env:PROYECTO_ID = 'f1e1b6a1-0001-4a11-9c00-000000000002'
$env:ESTUDIO_ID = 'f1e1b6a1-0002-4a11-9c00-000000000003'
$env:EVAL_EMAIL = 'profesor@test.com'
$env:EVAL_PASSWORD = '<SEED_PROFESOR_PASSWORD>'
$env:ADMIN_EMAIL = 'admin@test.com'
$env:ADMIN_PASSWORD = '<SEED_ADMIN_PASSWORD>'
```

Las pausas entre acciones van de 3 a 8 segundos. Puedes ajustar `PAUSA_MIN` y
`PAUSA_MAX` para representar el uso real; deben cumplir `0 <= mínimo <= máximo`.
No reduzcas las pausas solo para obtener mejores números: cambia la carga generada.

Para comprobar el contrato de los scripts sin Docker ni BD, después de instalar
las dependencias del repo:

```powershell
pnpm install --frozen-lockfile
node tests/load/check.mjs
```

Este check ejecuta una iteración por rol con k6 real contra una API local de
contrato y reutiliza el middleware CSRF del backend. Comprueba el segundo login,
el consentimiento, el token, el envío de resultados y el bloqueo/desbloqueo.
**No mide capacidad ni reemplaza una prueba contra el stack completo.**

## 5. Ejecutar por fases y guardar RAM/resultados

```powershell
./tests/load/run.ps1 -Fase smoke
./tests/load/run.ps1 -Fase baseline
./tests/load/run.ps1 -Fase load25
```

Cada ejecución guarda, en `tests/load/results/<fase>-<id>/`:

- `summary.json`: métricas y umbrales de k6.
- `resources.json`: pico observado de RAM del proceso k6, duración y código de salida.
- `stdout.log` y `stderr.log`: salida y errores de la prueba.

El runner observa la RAM cada 100 ms. No mide la RAM del backend, Docker o WSL;
usa `docker stats` y el Administrador de tareas para esos consumos. Los resultados
locales están ignorados por Git. El código de salida de k6 se conserva: `99`
indica un umbral incumplido y otros códigos pueden indicar un error del script.
Al interrumpir el runner con Ctrl+C, su bloque de limpieza detiene su proceso k6
y guarda los recursos observados con `cancelled: true`; el resumen puede quedar incompleto.

Sube al siguiente peldaño solo si el anterior cumple sus umbrales y el equipo
no está saturado:

| Fase | Duración aproximada | Objetivo |
|---|---|---|
| `smoke` | 1 min | Validar el flujo con pocos VUs, sin errores HTTP |
| `baseline` | 3 min | Referencia pequeña; p95 < 300 ms |
| `load25`, `load50`, `load100`, `load150`, `load200` | 3 min cada una | Aumentar carga; p95 < 500 ms, errores HTTP < 1 % |
| `load` | 15,5 min | Los cinco peldaños seguidos; después de validarlos individualmente |
| `stress` | 11 min | Hasta 300 VUs; observar el punto de quiebre |
| `spike` | 3,5 min | Entrada rápida de 200 participantes |
| `soak` | 33 min | Observar degradación sostenida con 100 VUs |

La carga mixta reparte aproximadamente 70 % evaluador, 25 % participante y 5 %
admin. El redondeo y el mínimo de un VU por rol hacen que smoke tenga 3 VUs y
baseline 11. En el peldaño de 200 se ejecutan 140 + 50 + 10 VUs.

El spike de participantes se ejecuta así:

```powershell
./tests/load/run.ps1 -Fase spike -Script tests/load/participante.k6.js
```

Para medir solo evaluadores, usa `-Script tests/load/evaluador.k6.js`. Cada VU
evaluador comparte una cuenta: esta prueba mide tráfico del rol, **no conflictos
de edición entre personas distintas**. Los participantes se crean por iteración,
así que la BD crece durante las fases largas. No ejecutes stress/soak como primera prueba.

## 6. Pasada realista y limpieza

Reinicia únicamente el proyecto de pruebas. `down -v` borra su BD:

```powershell
dc down -v
dcr up -d --build --wait --wait-timeout 180
dcr exec -e SEED_PASSWORD=<clave> -e SEED_PROFESOR_PASSWORD=<clave> -e SEED_ADMIN_PASSWORD=<clave> backend pnpm run seed
./tests/load/run.ps1 -Fase spike -Script tests/load/participante.k6.js
```

Desde una sola IP se esperan 429 del backend y posiblemente 503 de nginx.
El incumplimiento de umbrales en esa pasada registra el efecto de los límites;
conserva el resultado y separa ese diagnóstico del de capacidad.

Al terminar, si ya no necesitas los datos de pruebas:

```powershell
dcr down -v
```

Por cada fase conserva los percentiles, errores, iterations, RAM de k6 y picos
de CPU/RAM de los contenedores. Describe el equipo, límites, dataset y pausas
usados para que otra persona pueda repetir la medición.
