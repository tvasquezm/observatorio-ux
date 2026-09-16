// apps/frontend/src/features/projects/api/projects.api.ts

import { evaluatorRequest } from '../../../shared/api/evaluator-client';

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoPorId: string;
  createdAt: string;
  salaId?: string | null;
  _count?: {
    sesiones: number;
    artefactos: number;
  };
}

export interface AdminProjectSession {
  id: string;
  nombre: string;
  tipo: 'CARD_SORTING' | 'EVALUACION_HEURISTICA';
  estado: 'INVITADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'ABANDONADO';
  actor: 'PARTICIPANTE' | 'EVALUADOR';
  createdAt: string;
  completadoAt: string | null;
}

export interface AdminProjectOverview extends Omit<Proyecto, '_count'> {
  creadoPor: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  sesiones: AdminProjectSession[];
  _count: { artefactos: number };
}

export class ProjectsApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ProjectsApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return evaluatorRequest<T>(path, init, (status, message) => new ProjectsApiError(status, message));
}

export function listProjects(): Promise<Proyecto[]> {
  return request<Proyecto[]>('/projects');
}

export function getAdminProjectOverview(): Promise<AdminProjectOverview[]> {
  return request<AdminProjectOverview[]>('/projects/admin/overview');
}

export function getProject(id: string): Promise<Proyecto> {
  return request<Proyecto>(`/projects/${id}`);
}

export function createProject(
  nombre: string,
  descripcion?: string,
  salaId?: string,
): Promise<Proyecto> {
  return request<Proyecto>('/projects', {
    method: 'POST',
    body: JSON.stringify({ nombre, descripcion, ...(salaId ? { salaId } : {}) }),
  });
}

export function updateProject(
  id: string,
  data: { nombre?: string; descripcion?: string },
): Promise<Proyecto> {
  return request<Proyecto>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteProject(id: string): Promise<{ eliminado: boolean }> {
  return request<{ eliminado: boolean }>(`/projects/${id}`, { method: 'DELETE' });
}

export interface MiembroProyecto {
  id: string;
  proyectoId: string;
  usuarioId: string;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
}

export function listMembers(proyectoId: string): Promise<MiembroProyecto[]> {
  return request<MiembroProyecto[]>(`/projects/${proyectoId}/miembros`);
}

export function addMember(proyectoId: string, email: string): Promise<MiembroProyecto> {
  return request<MiembroProyecto>(`/projects/${proyectoId}/miembros`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeMember(proyectoId: string, usuarioId: string): Promise<{ eliminado: boolean }> {
  return request<{ eliminado: boolean }>(`/projects/${proyectoId}/miembros/${usuarioId}`, {
    method: 'DELETE',
  });
}

// --- Whitelist de participantes (sujetos de estudio, distinto de miembros) ---
//
// Sin una entrada acá, AuthService.registerParticipant (backend) rechaza el
// autorregistro del participante con 403 — este es el paso previo obligatorio
// para que alguien pueda unirse a cualquier sesión (card sorting, evaluación
// heurística, etc). Ruta real: WhitelistEntryDto { email, nombre? } — el
// backend acepta bulk (mínimo 1), por eso el request toma un array.

export interface WhitelistEntry {
  id: string;
  email: string;
  nombre: string | null;
  usado: boolean;
  createdAt: string;
}

export interface WhitelistEntradaInput {
  email: string;
  nombre?: string;
}

export interface InvitationCredential {
  email: string;
  codigoInvitacion: string;
}

export interface AddToWhitelistResult {
  agregados: number;
  enviados: number;
  invitaciones: InvitationCredential[];
}

export function listWhitelist(proyectoId: string): Promise<WhitelistEntry[]> {
  return request<WhitelistEntry[]>(`/projects/${proyectoId}/participantes`);
}

export function addToWhitelist(
  proyectoId: string,
  participantes: WhitelistEntradaInput[],
): Promise<AddToWhitelistResult> {
  return request<AddToWhitelistResult>(
    `/projects/${proyectoId}/participantes`,
    {
      method: 'POST',
      body: JSON.stringify({ participantes }),
    },
  );
}
