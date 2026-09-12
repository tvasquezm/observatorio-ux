// apps/frontend/src/features/comments/api/comments.api.ts

import { useAuthStore } from '../../auth/store/useAuthStore';
import { notify } from '../../../shared/api/toast';
import { csrfHeaders } from '../../../shared/api/csrf';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface Comentario {
  id: string;
  proyectoId: string;
  artefactoLogicoId: string | null;
  texto: string;
  autorId: string;
  createdAt: string;
  autor: {
    id: string;
    nombre: string;
    email: string;
  };
}

export class CommentsApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'CommentsApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders(init.method),
        ...init.headers,
      },
    });
  } catch {
    throw new CommentsApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (res.status === 401) {
    useAuthStore.getState().logout();
    notify.error('Tu sesión expiró. Vuelve a iniciar sesión.');
    throw new CommentsApiError(401, 'Sesión expirada.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message)
      ? body.message.map((m: any) => m.mensaje ?? m).join(' ')
      : (body?.message ?? `Error HTTP ${res.status}`);
    throw new CommentsApiError(res.status, mensaje);
  }
  return (await res.json()) as T;
}

export function listComments(proyectoId: string): Promise<Comentario[]> {
  return request<Comentario[]>(`/projects/${proyectoId}/comments`);
}

export function createComment(proyectoId: string, texto: string): Promise<Comentario> {
  return request<Comentario>(`/projects/${proyectoId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ texto }),
  });
}

export function updateComment(
  proyectoId: string,
  comentarioId: string,
  texto: string,
): Promise<Comentario> {
  return request<Comentario>(`/projects/${proyectoId}/comments/${comentarioId}`, {
    method: 'PATCH',
    body: JSON.stringify({ texto }),
  });
}

export function removeComment(proyectoId: string, comentarioId: string): Promise<Comentario> {
  return request<Comentario>(`/projects/${proyectoId}/comments/${comentarioId}`, {
    method: 'DELETE',
  });
}
