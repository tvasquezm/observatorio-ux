// apps/frontend/src/features/evaluacion-heuristica/api/evaluacion-heuristica.api.ts
//
// Rutas reales (EvaluacionHeuristicaController, prefijo global 'api'):
//   POST  /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones
//   PATCH /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/hallazgos
//   POST  /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones/:sesionId/finalizar
//   GET   /api/proyectos/:proyectoId/evaluacion-heuristica/sesiones/:sesionId
//
// Forma confirmada contra HeuristicaDto real (apps/backend/.../dto/heuristica.dto.ts).

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface HallazgoHeuristica {
  heuristicaId: string;
  severidad: 0 | 1 | 2 | 3 | 4;
  descripcion: string;
  evidencia?: string;
  recomendacion?: string;
}

export interface EvaluacionHeuristicaSesion {
  id: string;
  proyectoId: string;
  estado: 'INVITADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'ABANDONADO';
  hallazgos: HallazgoHeuristica[];
  createdAt: string;
  completadoAt: string | null;
}

function getAuthToken(): string | null {
  return localStorage.getItem('evaluadorToken');
}

export class EvaluacionHeuristicaApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'EvaluacionHeuristicaApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new EvaluacionHeuristicaApiError(0, 'No se pudo conectar con el servidor.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message)
      ? body.message.map((m: any) => m.mensaje ?? m).join(' ')
      : (body?.message ?? `Error HTTP ${res.status}`);
    throw new EvaluacionHeuristicaApiError(res.status, mensaje);
  }
  return (await res.json()) as T;
}

export function crearSesionHeuristica(proyectoId: string): Promise<EvaluacionHeuristicaSesion> {
  return request(`/proyectos/${proyectoId}/evaluacion-heuristica/sesiones`, { method: 'POST' });
}

export function registrarHallazgo(
  proyectoId: string,
  sesionId: string,
  hallazgo: HallazgoHeuristica,
): Promise<EvaluacionHeuristicaSesion> {
  return request(`/proyectos/${proyectoId}/evaluacion-heuristica/sesiones/${sesionId}/hallazgos`, {
    method: 'PATCH',
    body: JSON.stringify(hallazgo),
  });
}

export function finalizarSesionHeuristica(
  proyectoId: string,
  sesionId: string,
): Promise<EvaluacionHeuristicaSesion> {
  return request(`/proyectos/${proyectoId}/evaluacion-heuristica/sesiones/${sesionId}/finalizar`, {
    method: 'POST',
  });
}

export function obtenerSesionHeuristica(
  proyectoId: string,
  sesionId: string,
): Promise<EvaluacionHeuristicaSesion> {
  return request(`/proyectos/${proyectoId}/evaluacion-heuristica/sesiones/${sesionId}`);
}
