# CIERRE FASE F8
Fecha: 2026-11-12
Hecho: renovación del JWT del evaluador con sessionStart invariable (iat como fallback legado), ventana, tope absoluto y 10 solicitudes/minuto. Login y me informan expiración. No cambia participantes, Prisma ni dependencias.
Contratos: POST /auth/refresh → 200 {renewed, session:{expiresAt}}; 401 vencido/tope, 429 límite. Login conserva 201. expiresAt es epoch milisegundos. JWT solo en cookie evaluadorToken; opciones originales.
Configuración: JWT_MAX_SESSION=12h, JWT_REFRESH_WINDOW=10m, JWT_EXPIRES_IN=1h. Duraciones positivas enteras s/m/h/d; formato ambiguo rechazado al arrancar. Ventana >= TTL se acota a TTL/3. Login también acota su primer token al máximo.
Archivos: servicio/controlador/estrategia auth, configuración, filtro (conserva errorCode SESSION_MAX_REACHED), middleware CSRF extraído sin cambios para probarlo, env y render.
Verificación: pnpm --filter backend test auth env.validation --runInBand → 6 suites, 56 tests verdes. pnpm --filter backend build verde. node apps/backend/scripts/check-session-refresh.mjs → PASS CSRF, JWT vencido, expiración en me, renovación acotada, cookie Secure/httpOnly y 429. Firma JWT real, Passport/Throttler reales, identidad en memoria; no usa DB.
Desvíos: prueba HTTP runnable fuera de Jest porque Jest rechaza el ciclo CJS/ESM de @nestjs/throttler con Nest 12. SESSION_MAX_REACHED se expone en errorCode, formato nativo del filtro.
Pendientes: revisión humana de auth antes de producción; no se desplegó ni se probó contra la base real.

Revisión final: renewed:false añade session.refreshAt (epoch ms), calculado con la ventana efectiva del servidor. Permite un único timeout en F10 cuando el TTL es corto o la ventana configurada difiere de 10m; no usa polling. Prueba de regresión reproducida roja y luego verde.
