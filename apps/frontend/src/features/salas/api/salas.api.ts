// apps/frontend/src/features/salas/api/salas.api.ts

import { useAuthStore } from '../../auth/store/useAuthStore';
import { notify } from '../../../shared/api/toast';
import { csrfHeaders } from '../../../shared/api/csrf';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface Sala {
  id: string;
  nombre: string;
  periodo: string;
  instrucciones?: string;
  createdAt: string;
}

export interface CreateSalaDto {
  nombre: string;
  periodo: string;
  instrucciones?: string;
}

export class SalasApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'SalasApiError';
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
    throw new SalasApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (res.status === 401) {
    useAuthStore.getState().logout();
    notify.error('Tu sesión expiró. Vuelve a iniciar sesión.');
    throw new SalasApiError(401, 'Sesión expirada.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message)
      ? body.message.map((m: any) => m.mensaje ?? m).join(' ')
      : (body?.message ?? `Error HTTP ${res.status}`);
    throw new SalasApiError(res.status, mensaje);
  }

  return (await res.json()) as T;
}

export function getSalas(): Promise<Sala[]> {
  return request<Sala[]>('/salas');
}

export function createSala(data: CreateSalaDto): Promise<Sala> {
  return request<Sala>('/salas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Estudiantes (registro liviano, sin cuenta) ---

export interface SalaEstudiante {
  id: string;
  salaId: string;
  nombre: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaEstudianteInput {
  email: string;
  nombre?: string;
}

export function listEstudiantes(salaId: string): Promise<SalaEstudiante[]> {
  return request<SalaEstudiante[]>(`/salas/${salaId}/estudiantes`);
}

export function addEstudiante(
  salaId: string,
  data: SalaEstudianteInput,
): Promise<SalaEstudiante> {
  return request<SalaEstudiante>(`/salas/${salaId}/estudiantes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addEstudiantesBulk(
  salaId: string,
  estudiantes: SalaEstudianteInput[],
): Promise<{ agregados: number; enviados: number }> {
  return request<{ agregados: number; enviados: number }>(
    `/salas/${salaId}/estudiantes/bulk`,
    {
      method: 'POST',
      body: JSON.stringify({ estudiantes }),
    },
  );
}

export function updateEstudiante(
  salaId: string,
  estudianteId: string,
  data: Partial<SalaEstudianteInput>,
): Promise<SalaEstudiante> {
  return request<SalaEstudiante>(`/salas/${salaId}/estudiantes/${estudianteId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function removeEstudiante(
  salaId: string,
  estudianteId: string,
): Promise<{ eliminado: boolean }> {
  return request<{ eliminado: boolean }>(`/salas/${salaId}/estudiantes/${estudianteId}`, {
    method: 'DELETE',
  });
}

// --- Proyectos alojados en la sala ---

export interface ProyectoEnSala {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoPorId: string;
  salaId: string | null;
  createdAt: string;
}

export function listProyectosDeSala(salaId: string): Promise<ProyectoEnSala[]> {
  return request<ProyectoEnSala[]>(`/salas/${salaId}/proyectos`);
}

export function createProyectoEnSala(
  salaId: string,
  data: { nombre: string; descripcion?: string },
): Promise<ProyectoEnSala> {
  return request<ProyectoEnSala>(`/salas/${salaId}/proyectos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function vincularProyecto(
  salaId: string,
  proyectoId: string,
): Promise<ProyectoEnSala> {
  return request<ProyectoEnSala>(`/salas/${salaId}/proyectos/${proyectoId}/vincular`, {
    method: 'POST',
  });
}

export function desvincularProyecto(
  salaId: string,
  proyectoId: string,
): Promise<{ desvinculado: boolean }> {
  return request<{ desvinculado: boolean }>(`/salas/${salaId}/proyectos/${proyectoId}`, {
    method: 'DELETE',
  });
}
