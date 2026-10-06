// apps/frontend/src/features/evaluacion-heuristica/api/evaluacion-heuristica.api.ts
//
// Rutas reales (EvaluacionHeuristicaController, prefijo global 'api'):
//   POST  /api/projects/:proyectoId/evaluacion-heuristica/sesiones
//   PATCH /api/projects/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/hallazgos
//   POST  /api/projects/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/finalizar
//   GET   /api/projects/:proyectoId/evaluacion-heuristica/sesiones/:sesionId
//
// Forma confirmada contra HeuristicaDto real (apps/backend/.../dto/heuristica.dto.ts).

import { evaluatorRequest } from '../../../shared/api/evaluator-client';

export interface HallazgoHeuristicaInput {
  heuristicaId: string;
  severidad: 0 | 1 | 2 | 3 | 4;
  descripcion: string;
  evidencia?: string;
  recomendacion?: string;
}

// Lo que realmente devuelve el backend por hallazgo (HeuristicFinding en
// evaluacion-heuristica.service.ts): además de los campos de entrada, trae
// `id` (generado con randomUUID) y `registradoEn` (timestamp ISO).
export interface HallazgoHeuristica extends HallazgoHeuristicaInput {
  id: string;
  registradoEn: string;
}

// OJO: el modelo Prisma `researchSession` (backend) guarda los hallazgos en
// el campo `resultado` (JSON), no `hallazgos` — el nombre `hallazgos` nunca
// existió en la respuesta real y rompía la UI al leer `sesion.hallazgos`.
export interface EvaluacionHeuristicaSesion {
  id: string;
  proyectoId: string;
  estado: 'INVITADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'ABANDONADO';
  resultado: HallazgoHeuristica[];
  createdAt: string;
  completadoAt: string | null;
}

export class EvaluacionHeuristicaApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'EvaluacionHeuristicaApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return evaluatorRequest<T>(
    path,
    init,
    (status, message) => new EvaluacionHeuristicaApiError(status, message),
  );
}

export function crearSesionHeuristica(proyectoId: string): Promise<EvaluacionHeuristicaSesion> {
  return request(`/projects/${proyectoId}/evaluacion-heuristica/sesiones`, { method: 'POST' });
}

export function listarSesionesHeuristicas(proyectoId: string): Promise<EvaluacionHeuristicaSesion[]> {
  return request(`/projects/${proyectoId}/evaluacion-heuristica/sesiones`);
}

export async function registrarHallazgo(
  proyectoId: string,
  sesionId: string,
  hallazgo: HallazgoHeuristicaInput,
): Promise<EvaluacionHeuristicaSesion> {
  // El backend (EvaluacionHeuristicaService.registrarHallazgo) responde
  // { mensaje, hallazgo, sesion } — no la sesión directa. Se desenvuelve acá
  // para que el resto del frontend siga trabajando con EvaluacionHeuristicaSesion.
  const respuesta = await request<{
    mensaje: string;
    hallazgo: HallazgoHeuristica;
    sesion: EvaluacionHeuristicaSesion;
  }>(`/projects/${proyectoId}/evaluacion-heuristica/sesiones/${sesionId}/hallazgos`, {
    method: 'PATCH',
    body: JSON.stringify(hallazgo),
  });
  return respuesta.sesion;
}

export function finalizarSesionHeuristica(
  proyectoId: string,
  sesionId: string,
): Promise<EvaluacionHeuristicaSesion> {
  return request(`/projects/${proyectoId}/evaluacion-heuristica/sesiones/${sesionId}/finalizar`, {
    method: 'POST',
  });
}

export function obtenerSesionHeuristica(
  proyectoId: string,
  sesionId: string,
): Promise<EvaluacionHeuristicaSesion> {
  return request(`/projects/${proyectoId}/evaluacion-heuristica/sesiones/${sesionId}`);
}

export interface AnaliticaSeveridad {
  severidad: 0 | 1 | 2 | 3 | 4;
  count: number;
  porcentaje: number;
}

export interface AnaliticaHeuristica {
  sesionesTotal: number;
  sesionesCompletadas: number;
  hallazgosTotal: number;
  porSeveridad: AnaliticaSeveridad[];
}

export function obtenerAnaliticaHeuristica(proyectoId: string): Promise<AnaliticaHeuristica> {
  return request(`/projects/${proyectoId}/evaluacion-heuristica/analytics`);
}
