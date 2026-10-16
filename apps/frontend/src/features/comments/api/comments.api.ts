// apps/frontend/src/features/comments/api/comments.api.ts

import { evaluatorRequest } from '../../../shared/api/evaluator-client';

export interface Comentario {
  id: string;
  proyectoId: string;
  artefactoLogicoId: string | null;
  tecnica: string | null;
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
  return evaluatorRequest<T>(path, init, (status, message) => new CommentsApiError(status, message));
}

// `filtro`: clave de tecnica o `general`; sin valor devuelve todos.
export function listComments(proyectoId: string, filtro?: string): Promise<Comentario[]> {
  const query = filtro ? `?tecnica=${encodeURIComponent(filtro)}` : '';
  return request<Comentario[]>(`/projects/${proyectoId}/comments${query}`);
}

export function createComment(proyectoId: string, texto: string, tecnica?: string): Promise<Comentario> {
  return request<Comentario>(`/projects/${proyectoId}/comments`, {
    method: 'POST',
    body: JSON.stringify(tecnica ? { texto, tecnica } : { texto }),
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
