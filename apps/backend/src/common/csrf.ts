import type { Request, Response, NextFunction } from 'express';
import appConfig from '../core/config/app.config.js';

// CSRF (double-submit cookie): solo aplica a requests que ya traen la
// cookie httpOnly `evaluadorToken` (o sea, sesión de EVALUADOR autenticada
// por cookie) y a métodos mutantes. El flujo de PARTICIPANTE usa Bearer
// token (o, en el primer paso de acceso, ningún token todavía) — pero si
// el mismo navegador tiene además una sesión de EVALUADOR abierta (ej.
// alguien probando su propio link de participante en la misma pestaña),
// la cookie `evaluadorToken` viaja igual "de arrastre" en cualquier
// pedido al mismo origen, aunque el pedido no la use para autenticarse.
// Por eso se excluyen también:
//   - pedidos con `Authorization: Bearer` (no vulnerable a CSRF: un
//     navegador nunca adjunta ese header solo, a diferencia de una cookie).
//   - las rutas públicas de acceso de participante (`/auth/participants/*`),
//     que ni siquiera tienen token todavía en el primer paso y nunca se
//     autentican con la cookie de evaluador.
//
// Las mutaciones con cookie de evaluador deben venir del origen configurado
// cuando el cliente envía Origin.

const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PREFIJOS_EXENTOS_CSRF = ['/api/auth/participants'];

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const tieneCookieDeSesion = Boolean((req as any).cookies?.evaluadorToken);
  if (!METODOS_MUTANTES.has(req.method) || !tieneCookieDeSesion) {
    next();
    return;
  }

  const origin = req.header('origin');
  if (origin !== undefined && origin !== appConfig().corsOrigin) {
    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Origen no permitido.',
    });
    return;
  }

  const tieneBearer = Boolean(req.header('authorization'));
  const esRutaExenta = PREFIJOS_EXENTOS_CSRF.some((prefijo) => req.path.startsWith(prefijo));
  if (tieneBearer || esRutaExenta) {
    next();
    return;
  }

  const headerToken = req.header('x-csrf-token');
  const cookieToken = (req as any).cookies?.csrfToken;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Token CSRF inválido o ausente.',
    });
    return;
  }

  next();
}
