// apps/frontend/src/shared/api/csrf.ts
//
// Double-submit cookie: el backend (auth.controller.ts) emite la cookie
// `csrfToken` (NO httpOnly, a propósito — el JS del frontend la necesita
// leer) junto con la cookie de sesión `evaluadorToken` (esa sí httpOnly).
// `main.ts` → `csrfProtection` exige que todo método mutante (POST/PUT/
// PATCH/DELETE) que ya traiga la cookie de sesión también traiga el
// header `x-csrf-token` con el mismo valor que la cookie — si no calzan
// o falta uno de los dos, responde 403 antes de llegar al controller.
//
// Los métodos de solo lectura (GET) no se chequean en el backend, así
// que acá tampoco hace falta calcular el header para ellos.

const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Devuelve `{ 'X-CSRF-Token': ... }` si `method` es mutante y hay cookie
 * disponible; objeto vacío en cualquier otro caso (spread-eable directo
 * en `headers` sin condicionales en cada call site).
 */
export function csrfHeaders(method?: string): Record<string, string> {
  const metodo = (method ?? 'GET').toUpperCase();
  if (!METODOS_MUTANTES.has(metodo)) return {};

  const token = getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}
