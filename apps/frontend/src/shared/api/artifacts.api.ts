// apps/frontend/src/shared/api/artifacts.api.ts
//
// Cliente genérico para ArtifactsController (backend), compartido por las
// tres features que usan el modelo versionado UxArtifact: persona,
// journey-map, momentos-criticos. Sin estado, sin hooks — solo fetch + tipos,
// mismo criterio que features/card-sorting/api/card-sorting.api.ts.
//
// El store de autenticación del evaluador y este cliente comparten la llave
// `evaluadorToken` en localStorage.

import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { notify } from './toast';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type TipoArtefacto = 'PERSONA' | 'JOURNEY_MAP' | 'MOMENTOS_CRITICOS';

export interface UxArtifact<TContenido = unknown> {
  id: string;
  proyectoId: string;
  tipo: TipoArtefacto;
  artefactoLogicoId: string;
  version: number;
  contenido: TContenido;
  autorId: string;
  createdAt: string;
  lockedById: string | null;
  lockedUntil: string | null;
}

// Estructura acordada tras la decisión del dueño (Sprint 3): el backend
// ahora emite `message` como { campo, mensaje }[] en los 400 de validación
// (ver exceptionFactory en main.ts), así que se recupera el detalle por campo.
export interface DetalleValidacion {
  campo: string;
  mensaje: string;
}

export class ArtifactsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalles?: DetalleValidacion[],
  ) {
    super(message);
    this.name = 'ArtifactsApiError';
  }
}

function normalizarDetalles(message: unknown): DetalleValidacion[] | undefined {
  if (Array.isArray(message) && message.every((m) => m && typeof m === 'object' && 'campo' in m)) {
    return message as DetalleValidacion[];
  }
  if (Array.isArray(message)) {
    return message.map((m) => ({ campo: '', mensaje: String(m) }));
  }
  return undefined;
}

function getAuthToken(): string | null {
  return localStorage.getItem('evaluadorToken');
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
    throw new ArtifactsApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (res.status === 401) {
    // Sesión expirada o token inválido: no tiene sentido reintentar ni
    // mostrar el body del error crudo — se cierra sesión (limpia el token
    // de useAuthStore/localStorage) y se avisa. ProtectedRoute ya está
    // suscrito a `isAuthenticated`, así que el logout por sí solo dispara
    // el redirect a /login sin necesitar un evento global aparte.
    useAuthStore.getState().logout();
    notify.error('Tu sesión expiró. Vuelve a iniciar sesión.');
    throw new ArtifactsApiError(401, 'Sesión expirada.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detalles = normalizarDetalles(body?.message);
    const mensaje = detalles ? detalles.map((d) => d.mensaje).join(' ') : (typeof body?.message === 'string' ? body.message : undefined);
    throw new ArtifactsApiError(res.status, mensaje ?? `Error HTTP ${res.status}`, detalles);
  }

  // Confirmado por prueba real: el backend devuelve el objeto directo,
  // sin envoltorio { data, meta }.
  return (await res.json()) as T;
}

/**
 * Lista los artefactos de un proyecto, opcionalmente filtrados por tipo.
 * OJO: el backend devuelve TODAS las versiones (orderBy artefactoLogicoId
 * asc, version desc), no solo la última — usar `dedupeLatestVersions` antes
 * de mostrar una lista en UI.
 */
export function listArtifacts<T = unknown>(
  proyectoId: string,
  tipo?: TipoArtefacto,
): Promise<UxArtifact<T>[]> {
  const query = tipo ? `?tipo=${tipo}` : '';
  return request<UxArtifact<T>[]>(`/projects/${proyectoId}/artifacts${query}`);
}

/** Se queda solo con la versión más reciente de cada artefacto lógico. */
export function dedupeLatestVersions<T>(items: UxArtifact<T>[]): UxArtifact<T>[] {
  const vistos = new Set<string>();
  const resultado: UxArtifact<T>[] = [];
  // El backend ya ordena version desc dentro de cada artefactoLogicoId,
  // así que el primero que aparece por id lógico es siempre el más nuevo.
  for (const item of items) {
    if (!vistos.has(item.artefactoLogicoId)) {
      vistos.add(item.artefactoLogicoId);
      resultado.push(item);
    }
  }
  return resultado;
}

// Todas las rutas de abajo llevan proyectoId porque es parte del path del
// controller completo (@Controller('projects/:proyectoId/artifacts')), aun
// en los métodos donde el handler no lo usa dentro del cuerpo (findOne,
// createVersion, lock) — Nest igual lo exige en la URL.

export function getArtifact<T = unknown>(
  proyectoId: string,
  artefactoId: string,
): Promise<UxArtifact<T>> {
  return request<UxArtifact<T>>(`/projects/${proyectoId}/artifacts/${artefactoId}`);
}

export function createArtifact<T = unknown>(
  proyectoId: string,
  tipo: TipoArtefacto,
  contenido: T,
  artefactoLogicoId?: string,
): Promise<UxArtifact<T>> {
  return request<UxArtifact<T>>(`/projects/${proyectoId}/artifacts`, {
    method: 'POST',
    body: JSON.stringify({ tipo, contenido, artefactoLogicoId }),
  });
}


/**
 * Crea una nueva versión de un artefacto lógico ya existente.
 * Pega directo al endpoint de versionado del backend
 * (`POST /projects/:proyectoId/artifacts/:artefactoId/versions`), que solo
 * espera `{ contenido }` — el `tipo` no se manda porque el backend ya lo
 * conoce a través del artefacto lógico existente (ver
 * `ArtifactsController.createVersion` / `ArtifactsService.createVersion`).
 *
 * OJO: `artefactoId` acá es cualquier fila (versión) de ese artefacto
 * lógico — el service resuelve la última versión real internamente.
 */
export function createArtifactVersion<T = unknown>(
  proyectoId: string,
  artefactoId: string,
  contenido: T,
): Promise<UxArtifact<T>> {
  return request<UxArtifact<T>>(
    `/projects/${proyectoId}/artifacts/${artefactoId}/versions`,
    { method: 'POST', body: JSON.stringify({ contenido }) },
  );
}

export function acquireLock<T = unknown>(
  proyectoId: string,
  artefactoId: string,
  ttlSegundos?: number,
): Promise<UxArtifact<T>> {
  return request<UxArtifact<T>>(
    `/projects/${proyectoId}/artifacts/${artefactoId}/lock`,
    { method: 'POST', body: JSON.stringify({ ttlSegundos }) },
  );
}

export function releaseLock<T = unknown>(
  proyectoId: string,
  artefactoId: string,
): Promise<UxArtifact<T>> {
  return request<UxArtifact<T>>(
    `/projects/${proyectoId}/artifacts/${artefactoId}/lock`,
    { method: 'DELETE' },
  );
}

/**
 * Elimina el artefacto. El backend hace soft delete (marca `deletedAt` en
 * todas las versiones del artefacto lógico) — la fila nunca se borra de la
 * base de datos, así que el objeto devuelto sigue existiendo, solo que ya
 * no aparecerá en listArtifacts.
 */
export function deleteArtifact(
  proyectoId: string,
  artefactoId: string,
): Promise<void> {
  return request<void>(`/projects/${proyectoId}/artifacts/${artefactoId}`, {
    method: 'DELETE',
  });
}
