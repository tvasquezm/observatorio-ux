// apps/frontend/src/features/admin/api/users.api.ts

import { evaluatorRequest } from '../../../shared/api/evaluator-client';
import type { EvaluatorRole } from '../../auth/api/auth.api';

export interface Docente {
  id: string;
  nombre: string;
  email: string;
  rol: EvaluatorRole;
  createdAt: string;
}

export type UsuarioCuenta = Docente;

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
  return evaluatorRequest<T>(path, init, (status, message) => new UsersApiError(status, message));
}

export function getDocentes(): Promise<Docente[]> {
  return request<Docente[]>('/users');
}

export function getAccounts(): Promise<UsuarioCuenta[]> {
  return request<UsuarioCuenta[]>('/users/accounts');
}

export function updateUserRole(id: string, rol: EvaluatorRole): Promise<UsuarioCuenta> {
  return request<UsuarioCuenta>(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ rol }),
  });
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
