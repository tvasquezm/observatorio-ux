// apps/frontend/src/features/equipos/api/equipos.api.ts

import { useAuthStore } from '../../auth/store/useAuthStore';
import { notify } from '../../../shared/api/toast';
import { csrfHeaders } from '../../../shared/api/csrf';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface MiembroEquipo {
  equipoId: string;
  usuarioId: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
  };
}

export interface Equipo {
  id: string;
  salaId: string;
  nombre: string;
  creadoPorId: string;
  createdAt: string;
  miembros: MiembroEquipo[];
}

export class EquiposApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'EquiposApiError';
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
    throw new EquiposApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (res.status === 401) {
    useAuthStore.getState().logout();
    notify.error('Tu sesión expiró. Vuelve a iniciar sesión.');
    throw new EquiposApiError(401, 'Sesión expirada.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message)
      ? body.message.map((m: any) => m.mensaje ?? m).join(' ')
      : (body?.message ?? `Error HTTP ${res.status}`);
    throw new EquiposApiError(res.status, mensaje);
  }
  return (await res.json()) as T;
}

export function listEquipos(salaId: string): Promise<Equipo[]> {
  return request<Equipo[]>(`/salas/${salaId}/equipos`);
}

export function createEquipo(salaId: string, nombre: string): Promise<Equipo> {
  return request<Equipo>(`/salas/${salaId}/equipos`, {
    method: 'POST',
    body: JSON.stringify({ nombre }),
  });
}

export function updateEquipo(salaId: string, equipoId: string, nombre: string): Promise<Equipo> {
  return request<Equipo>(`/salas/${salaId}/equipos/${equipoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ nombre }),
  });
}

export function removeEquipo(salaId: string, equipoId: string): Promise<Equipo> {
  return request<Equipo>(`/salas/${salaId}/equipos/${equipoId}`, {
    method: 'DELETE',
  });
}

export function addMiembroEquipo(
  salaId: string,
  equipoId: string,
  email: string,
): Promise<Equipo> {
  return request<Equipo>(`/salas/${salaId}/equipos/${equipoId}/miembros`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeMiembroEquipo(
  salaId: string,
  equipoId: string,
  usuarioId: string,
): Promise<{ usuarioId: string }> {
  return request<{ usuarioId: string }>(
    `/salas/${salaId}/equipos/${equipoId}/miembros/${usuarioId}`,
    { method: 'DELETE' },
  );
}
