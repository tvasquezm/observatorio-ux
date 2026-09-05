// apps/frontend/src/features/auth/api/auth.api.ts
//
// Cliente de login para EVALUADOR (ESTUDIANTE/DOCENTE/ADMIN).
// Distinto del flujo de PARTICIPANTE (shared/api/api-client.ts), que usa
// otro token ('participanteToken') y otro endpoint de reanudación.

import { csrfHeaders } from '../../../shared/api/csrf';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type EvaluatorRole = 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN';

export interface EvaluatorUser {
  id: string;
  nombre: string;
  email: string;
  rol: EvaluatorRole;
}

export interface LoginResponse {
  user: EvaluatorUser;
}

export class AuthApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include', // necesario para que el navegador guarde las cookies httpOnly `evaluadorToken`/`csrfToken` que emite el backend (cross-origin en dev: 5173 → 3000).
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AuthApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message)
      ? body.message.map((m: any) => m.mensaje ?? m).join(' ')
      : (body?.message ?? 'Correo o contraseña incorrectos.');
    throw new AuthApiError(res.status, mensaje);
  }

  // El body ya NO trae access_token (Fase 3: el token va en cookie
  // httpOnly, seteada por el propio Set-Cookie de esta respuesta).
  return (await res.json()) as LoginResponse;
}

/**
 * Limpia las cookies de sesión (`evaluadorToken`/`csrfToken`) en el
 * backend. Sin body de request — no es una mutación de dominio, así que
 * el middleware CSRF la deja pasar igual que cualquier otra, pero por
 * prolijidad se manda el header de todas formas si hay cookie disponible.
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders('POST') },
  }).catch(() => {
    // Best-effort — ver useAuthStore.logout(): el estado local ya se
    // limpió sin importar si esta llamada de red tuvo éxito.
  });
}
