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

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(init.method),
    },
    ...init,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.message ?? `Error HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function getSalas(): Promise<Sala[]> {
  return request<Sala[]>('/salas', {
    method: 'GET',
  });
}

export function createSala(data: CreateSalaDto): Promise<Sala> {
  return request<Sala>('/salas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}