# Deuda técnica

Registrada el 1 de octubre de 2026, al cerrar el trabajo de la rama
`perf/capa-de-cache`. Plan completo en `PLAN-capa-de-cache.md`; las decisiones de
cache están en `ARCHITECTURE.md` (secciones "Estrategia de cache").

## Cache

1. **Lecturas pesadas sin cachear (Fase 3 saltada).**
   `card-sorting/:id/analytics`, `reports/json` y `projects/admin/overview`
   hacen consultas con `include` anidados y cálculo en memoria. Se decidió no
   cachearlas porque las consulta un docente o admin de vez en cuando y no hay
   mediciones que lo justifiquen.
   - Cuándo retomar: si `k6 run tests/load/participante.k6.js` o el tiempo de
     `GET /api/card-sorting/:id/analytics` con 100 o más participantes muestran
     un costo real.
   - Cuidado: `buildReport` filtra las sesiones según el usuario que pide el
     reporte, así que la clave de cache debe incluir al usuario.
   - Al cachear hay que invalidar en cada escritura de card-sorting, evaluación
     heurística, artefactos y comentarios del proyecto afectado.

2. **`assertAccess` sin cachear.**
   Se ejecuta en cada request con `proyectoId` (1 o 2 consultas por clave
   primaria). No se cacheó porque depende de proyecto, membresías y sala, y
   tiene más de diez puntos de escritura, incluidas bajas en cascada de salas.
   Retener un acceso revocado pesa más que el ahorro. Reevaluar tras medir.

3. **Cache de identidad por proceso.**
   `AuthService` guarda 30 s la identidad del token en memoria. Con más de una
   réplica de backend, un cambio de rol o un borrado tardaría hasta 30 s en
   verse en las demás. Ese es el momento de reemplazar `TtlCache` por Redis, que
   también serviría para compartir el throttler.
   - Hoy, un borrado hecho fuera del panel de admin (directo en la base o por la
     limpieza horaria de participantes huérfanos) se refleja hasta 30 s después.

4. **`staleTime` largo solo en docentes y cuentas.**
   `salas`, `projects` y `users/estudiantes` quedaron con el valor global de 30 s
   porque sus mutaciones no invalidan todas las queries relacionadas. Para
   alargarlos hay que completar las invalidaciones primero.

5. **Prefijo `__Host-` en las cookies de sesión.**
   No se adoptó porque puede romper el login en `localhost` sobre http. Evaluar
   cuando el entorno de desarrollo use https.

## Privacidad

6. **Revisión legal del texto de `/privacidad`.**
   Los textos del login, del consentimiento y de la página son legales y
   requieren revisión de quien responda por el proyecto antes de publicarse. La
   Ley 21.719 entra en vigor el 1 de diciembre de 2026. Conviene revisar las
   guías oficiales de la Agencia cuando las emita, porque las fuentes consultadas
   sobre cookies eran sitios comerciales.

7. **Campo `ipRegistro` sin uso.**
   La columna existe en `Consentimiento` (`schema.prisma`), pero ningún código la
   escribe. O se elimina con una migración, o, si se empieza a guardar la IP, hay
   que informarlo en el consentimiento y en `/privacidad`, y revisar la frase
   "No pediremos datos personales".

8. **Mantener `PrivacyPage` al día.**
   Si se agrega una cookie o una clave de `localStorage` o `sessionStorage`, hay
   que actualizar la página. Una cookie no esencial (analítica, seguimiento)
   exigiría además un banner con consentimiento previo.

## Verificación pendiente

9. **Suite completa del backend contra Postgres.**
   En el entorno de trabajo `prisma generate` falla con 403 al descargar los
   motores, así que los tests del backend se corrieron con un stub de
   `@prisma/client`. Falta confirmarlos en el CI o en local.

10. **Cabeceras de cache de punta a punta.**
    Se comprobaron con nginx real y servidores simulados. Falta levantar
    `docker-compose.production.yml` y confirmar que `/api/` responde
    `no-store`, `/assets/` `immutable` y `index.html` `no-cache`.
