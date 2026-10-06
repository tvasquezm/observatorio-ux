// apps/frontend/src/features/salas/api/salas.api.ts

import { evaluatorRequest } from '../../../shared/api/evaluator-client';

export interface Sala {
  id: string;
  nombre: string;
  periodo: string;
  instrucciones?: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  createdAt: string;
  profesor?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  // Fase 4 — toggle de creación de equipos por ESTUDIANTE. limiteIntegrantesEquipo
  // nulo = sin límite.
  permiteCreacionEquipos: boolean;
  limiteIntegrantesEquipo: number | null;
  // Fase 5 — toggle de creación de proyectos por ESTUDIANTE.
  permiteCreacionProyectos: boolean;
  // Fase 2 — soft delete (20 días de ventana de recuperación).
  deletedAt?: string | null;
}

export interface CreateSalaDto {
  nombre: string;
  periodo: string;
  instrucciones?: string;
  fechaInicio: string;
  fechaFin: string;
}

export type UpdateSalaDto = Partial<CreateSalaDto> & {
  permiteCreacionEquipos?: boolean;
  limiteIntegrantesEquipo?: number;
  permiteCreacionProyectos?: boolean;
};

export class SalasApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'SalasApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return evaluatorRequest<T>(path, init, (status, message) => new SalasApiError(status, message));
}

export function getSalas(): Promise<Sala[]> {
  return request<Sala[]>('/salas');
}

export function getSala(salaId: string): Promise<Sala> {
  return request<Sala>(`/salas/${salaId}`);
}

export function createSala(data: CreateSalaDto): Promise<Sala> {
  return request<Sala>('/salas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSala(salaId: string, data: UpdateSalaDto): Promise<Sala> {
  return request<Sala>(`/salas/${salaId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// --- Fase 2: soft delete / restore / hard delete ---

export function softDeleteSala(salaId: string): Promise<Sala> {
  return request<Sala>(`/salas/${salaId}`, { method: 'DELETE' });
}

export function getSalasEliminadas(): Promise<Sala[]> {
  return request<Sala[]>('/salas/eliminadas');
}

export function restoreSala(salaId: string): Promise<Sala> {
  return request<Sala>(`/salas/${salaId}/restore`, { method: 'POST' });
}

export function hardDeleteSala(salaId: string): Promise<{ eliminado: boolean }> {
  return request<{ eliminado: boolean }>(`/salas/${salaId}/hard`, {
    method: 'DELETE',
    body: JSON.stringify({ confirm: 'DELETE' }),
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
