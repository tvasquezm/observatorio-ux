// apps/frontend/src/features/evaluacion-heuristica/api/evaluacion-heuristica.api.ts
//
// Rutas reales (EvaluacionHeuristicaController, prefijo global 'api'),
// base: /api/projects/:proyectoId/evaluacion-heuristica
//   GET    /sesiones                                    POST /sesiones { nombre? }
//   GET    /sesiones/:sesionId                          POST /sesiones/:sesionId/finalizar
//   PATCH  /sesiones/:sesionId/hallazgos                (registra)
//   PATCH  /sesiones/:sesionId/hallazgos/:hallazgoId    DELETE (igual ruta)
//   POST   /sesiones/:sesionId/evidencias               (multipart, campo "archivo")
//   GET    /sesiones/:sesionId/evidencias/:evidenciaId  (binario)
//   GET    /analytics
//
// Forma confirmada contra HeuristicaDto real (apps/backend/.../dto/heuristica.dto.ts).

import type { HeuristicaId, SeveridadValor } from '@observatorio-ux/shared-types';
import {
  evaluatorBlob,
  evaluatorRequest,
  type ApiFieldError,
} from '../../../shared/api/evaluator-client';

export interface HallazgoHeuristicaInput {
  heuristicaId: HeuristicaId;
  severidad: SeveridadValor;
  titulo: string;
  pantalla: string;
  descripcion: string;
  evidencia: string;
  evidenciaUrl?: string | null;
  evidenciaArchivoId?: string | null;
  recomendacion: string;
}

export interface ResponsableHallazgo {
  id: string;
  nombre: string;
}

// Lo que devuelve el backend por hallazgo (HeuristicFinding). Los hallazgos
// guardados antes del rediseño no tienen los campos opcionales: la UI debe
// tolerar su ausencia.
export interface HallazgoHeuristica {
  id: string;
  heuristicaId: string;
  severidad: SeveridadValor;
  descripcion: string;
  evidencia: string | null;
  recomendacion: string | null;
  registradoEn: string;
  titulo?: string;
  pantalla?: string;
  evidenciaUrl?: string | null;
  evidenciaArchivoId?: string | null;
  responsable?: ResponsableHallazgo;
  actualizadoEn?: string;
}

// OJO: el modelo Prisma `researchSession` (backend) guarda los hallazgos en
// el campo `resultado` (JSON), no `hallazgos`.
export interface EvaluacionHeuristicaSesion {
  id: string;
  proyectoId: string;
  nombre?: string;
  estado: 'INVITADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'ABANDONADO';
  resultado: HallazgoHeuristica[];
  createdAt: string;
  completadoAt: string | null;
}

export interface EvidenciaSubida {
  id: string;
  mimeType: string;
  tamano: number;
  createdAt: string;
}

export class EvaluacionHeuristicaApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: ApiFieldError[],
  ) {
    super(message);
    this.name = 'EvaluacionHeuristicaApiError';
  }
}

const crearError = (status: number, message: string, details?: ApiFieldError[]) =>
  new EvaluacionHeuristicaApiError(status, message, details);

function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return evaluatorRequest<T>(path, init, crearError);
}

const base = (proyectoId: string) => `/projects/${proyectoId}/evaluacion-heuristica`;

export function crearSesionHeuristica(
  proyectoId: string,
  nombre?: string,
): Promise<EvaluacionHeuristicaSesion> {
  const limpio = nombre?.trim();
  return request(`${base(proyectoId)}/sesiones`, {
    method: 'POST',
    ...(limpio ? { body: JSON.stringify({ nombre: limpio }) } : {}),
  });
}

export function listarSesionesHeuristicas(proyectoId: string): Promise<EvaluacionHeuristicaSesion[]> {
  return request(`${base(proyectoId)}/sesiones`);
}

export async function registrarHallazgo(
  proyectoId: string,
  sesionId: string,
  hallazgo: HallazgoHeuristicaInput,
): Promise<EvaluacionHeuristicaSesion> {
  // El backend responde { mensaje, hallazgo, sesion } — no la sesión directa.
  // Se desenvuelve acá para que el resto del frontend trabaje con la sesión.
  const respuesta = await request<{
    mensaje: string;
    hallazgo: HallazgoHeuristica;
    sesion: EvaluacionHeuristicaSesion;
  }>(`${base(proyectoId)}/sesiones/${sesionId}/hallazgos`, {
    method: 'PATCH',
    body: JSON.stringify(hallazgo),
  });
  return respuesta.sesion;
}

export async function actualizarHallazgo(
  proyectoId: string,
  sesionId: string,
  hallazgoId: string,
  cambios: Partial<HallazgoHeuristicaInput>,
): Promise<EvaluacionHeuristicaSesion> {
  const respuesta = await request<{ sesion: EvaluacionHeuristicaSesion }>(
    `${base(proyectoId)}/sesiones/${sesionId}/hallazgos/${hallazgoId}`,
    { method: 'PATCH', body: JSON.stringify(cambios) },
  );
  return respuesta.sesion;
}

export async function eliminarHallazgo(
  proyectoId: string,
  sesionId: string,
  hallazgoId: string,
): Promise<EvaluacionHeuristicaSesion> {
  const respuesta = await request<{ sesion: EvaluacionHeuristicaSesion }>(
    `${base(proyectoId)}/sesiones/${sesionId}/hallazgos/${hallazgoId}`,
    { method: 'DELETE' },
  );
  return respuesta.sesion;
}

export function subirEvidencia(
  proyectoId: string,
  sesionId: string,
  archivo: File,
): Promise<EvidenciaSubida> {
  const datos = new FormData();
  datos.append('archivo', archivo);
  return request(`${base(proyectoId)}/sesiones/${sesionId}/evidencias`, {
    method: 'POST',
    body: datos,
  });
}

export function obtenerEvidenciaBlob(
  proyectoId: string,
  sesionId: string,
  evidenciaId: string,
): Promise<Blob> {
  return evaluatorBlob(`${base(proyectoId)}/sesiones/${sesionId}/evidencias/${evidenciaId}`, crearError);
}

export function finalizarSesionHeuristica(
  proyectoId: string,
  sesionId: string,
): Promise<EvaluacionHeuristicaSesion> {
  return request(`${base(proyectoId)}/sesiones/${sesionId}/finalizar`, { method: 'POST' });
}

export function obtenerSesionHeuristica(
  proyectoId: string,
  sesionId: string,
): Promise<EvaluacionHeuristicaSesion> {
  return request(`${base(proyectoId)}/sesiones/${sesionId}`);
}

export interface AnaliticaSeveridad {
  severidad: SeveridadValor;
  count: number;
  porcentaje: number;
}

export interface AnaliticaHeuristicaItem {
  heuristicaId: string;
  count: number;
}

export interface AnaliticaHeuristica {
  sesionesTotal: number;
  sesionesCompletadas: number;
  hallazgosTotal: number;
  porSeveridad: AnaliticaSeveridad[];
  porHeuristica: AnaliticaHeuristicaItem[];
  sinClasificar: number;
}

export function obtenerAnaliticaHeuristica(proyectoId: string): Promise<AnaliticaHeuristica> {
  return request(`${base(proyectoId)}/analytics`);
}
