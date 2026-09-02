// apps/frontend/src/features/auth/api/auth.api.ts
//
// Cliente de login para EVALUADOR (ESTUDIANTE/DOCENTE/ADMIN).
// Distinto del flujo de PARTICIPANTE (shared/api/api-client.ts), que usa
// otro token ('participanteToken') y otro endpoint de reanudación.

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type EvaluatorRole = 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN';

export interface EvaluatorUser {
  id: string;
  nombre: string;
  email: string;
  rol: EvaluatorRole;
}

export interface LoginResponse {
  access_token: string;
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

  return (await res.json()) as LoginResponse;
}
