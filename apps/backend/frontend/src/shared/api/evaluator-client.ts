import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { csrfHeaders } from './csrf';
import { notify } from './toast';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface ApiFieldError {
  campo: string;
  mensaje: string;
}

export type ApiErrorFactory = (
  status: number,
  message: string,
  details?: ApiFieldError[],
) => Error;

function normalizeMessage(message: unknown): {
  message: string;
  details?: ApiFieldError[];
} {
  if (Array.isArray(message)) {
    const details = message.map((item) =>
      item && typeof item === 'object' && 'mensaje' in item
        ? {
            campo: 'campo' in item ? String(item.campo) : '',
            mensaje: String(item.mensaje),
          }
        : { campo: '', mensaje: String(item) },
    );
    return { message: details.map((item) => item.mensaje).join(' '), details };
  }
  return { message: typeof message === 'string' ? message : '' };
}

export async function evaluatorRequest<T>(
  path: string,
  init: RequestInit = {},
  createError: ApiErrorFactory = (status, message) => Object.assign(new Error(message), { status }),
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders(init.method),
        ...init.headers,
      },
    });
  } catch {
    throw createError(0, 'No se pudo conectar con el servidor.');
  }

  if (response.status === 401) {
    useAuthStore.getState().logout();
    notify.error('Tu sesión expiró. Vuelve a iniciar sesión.');
    throw createError(401, 'Sesión expirada.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const normalized = normalizeMessage(body?.message);
    throw createError(
      response.status,
      normalized.message || `Error HTTP ${response.status}`,
      normalized.details,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
