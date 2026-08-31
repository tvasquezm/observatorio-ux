// apps/frontend/src/shared/api/artifacts.api.ts
//
// Cliente genérico para ArtifactsController (backend), compartido por las
// tres features que usan el modelo versionado UxArtifact: persona,
// journey-map, momentos-criticos. Sin estado, sin hooks — solo fetch + tipos,
// mismo criterio que features/card-sorting/api/card-sorting.api.ts.
//
// NOTA / TODO: el dump del repo no incluye ningún store ni servicio de auth
// de EVALUADOR (solo el de PARTICIPANTE, en shared/api/api-client.ts, que
// lee 'participanteToken'). ArtifactsController exige JwtAuthGuard con roles
// ESTUDIANTE/DOCENTE/ADMIN, o sea token de evaluador. getAuthToken() de abajo
// es un placeholder — reemplazar por la fuente real (ej. un authStore de
// Zustand) en cuanto exista esa feature.

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

// OJO / CAMBIO DE CONTRATO: `detalles` era { campo, mensaje }[] asumiendo
// un envoltorio { error: { message, detalles } } que la prueba real contra
// el backend (POST /projects/:id/artifacts) no confirmó — la respuesta
// vino sin envoltorio. Con el filtro global plano acordado, lo único
// disponible es `message` (string | string[]), sin campo aislado.
export class ArtifactsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalles?: string[],
  ) {
    super(message);
    this.name = 'ArtifactsApiError';
  }
}

// TODO: reemplazar por el authStore real de evaluador cuando exista.
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

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new ArtifactsApiError(
      res.status,
      mensaje ?? `Error HTTP ${res.status}`,
      Array.isArray(body?.message) ? body.message : undefined,
    );
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
export function deleteArtifact<T = unknown>(
  proyectoId: string,
  artefactoId: string,
): Promise<UxArtifact<T>> {
  return request<UxArtifact<T>>(`/projects/${proyectoId}/artifacts/${artefactoId}`, {
    method: 'DELETE',
  });
}
