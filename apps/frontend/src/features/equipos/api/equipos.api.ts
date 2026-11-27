// apps/frontend/src/features/equipos/api/equipos.api.ts

import { evaluatorRequest } from '../../../shared/api/evaluator-client';

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

/** Alguien salió de un equipo del docente y conserva el acceso a los proyectos hasta que el docente decida. */
export interface AccesoPendiente {
  id: string;
  salaId: string;
  usuarioId: string;
  equipoNombre: string;
  createdAt: string;
  usuario: { id: string; nombre: string; email: string };
}

export class EquiposApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'EquiposApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return evaluatorRequest<T>(path, init, (status, message) => new EquiposApiError(status, message));
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

export function listAccesosPendientes(salaId: string): Promise<AccesoPendiente[]> {
  return request<AccesoPendiente[]>(`/salas/${salaId}/equipos/accesos-pendientes`);
}

export function resolverAccesoPendiente(salaId: string, revisionId: string, decision: 'QUITAR' | 'MANTENER'): Promise<unknown> {
  return request<unknown>(`/salas/${salaId}/equipos/accesos-pendientes/${revisionId}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
}
