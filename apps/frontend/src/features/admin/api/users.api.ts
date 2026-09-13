// apps/frontend/src/features/admin/api/users.api.ts

import { useAuthStore } from '../../auth/store/useAuthStore';
import { notify } from '../../../shared/api/toast';
import { csrfHeaders } from '../../../shared/api/csrf';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface Docente {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  createdAt: string;
}

export interface CreateDocenteDto {
  nombre: string;
  email: string;
  password: string;
}

export interface Estudiante {
  id: string;
  salaId: string;
  nombre: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export class UsersApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'UsersApiError';
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
    throw new UsersApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (res.status === 401) {
    useAuthStore.getState().logout();
    notify.error('Tu sesión expiró. Vuelve a iniciar sesión.');
    throw new UsersApiError(401, 'Sesión expirada.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message)
      ? body.message.map((m: any) => m.mensaje ?? m).join(' ')
      : (body?.message ?? `Error HTTP ${res.status}`);
    throw new UsersApiError(res.status, mensaje);
  }

  return (await res.json()) as T;
}

export function getDocentes(): Promise<Docente[]> {
  return request<Docente[]>('/users');
}

export function createDocente(data: CreateDocenteDto): Promise<Docente> {
  return request<Docente>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function removeDocente(id: string): Promise<{ eliminado: boolean }> {
  return request<{ eliminado: boolean }>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export function getEstudiantes(salaId?: string): Promise<Estudiante[]> {
  const qs = salaId ? `?salaId=${encodeURIComponent(salaId)}` : '';
  return request<Estudiante[]>(`/users/estudiantes${qs}`);
}
