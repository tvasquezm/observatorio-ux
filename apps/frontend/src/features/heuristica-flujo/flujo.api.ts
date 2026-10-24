import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { evaluatorRequest } from '../../shared/api/evaluator-client';

export function flujoRequest<T>(proyectoId: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  return evaluatorRequest<T>(`/projects/${encodeURIComponent(proyectoId)}/evaluacion-heuristica${path}`, {
    method, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export const listarEvaluaciones = (proyectoId: string) => flujoRequest<EvaluacionFlujo[]>(proyectoId, '/evaluaciones');
