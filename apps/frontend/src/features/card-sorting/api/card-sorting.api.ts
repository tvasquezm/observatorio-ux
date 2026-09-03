// apps/frontend/src/features/card-sorting/api/card-sorting.api.ts
//
// Funciones puras de acceso HTTP para Card Sorting. Sin estado, sin
// hooks — solo fetch + tipos. Aislamiento: esto no importa nada de
// otras features (ej. features/artifacts), solo del shared/ transversal
// si en algún momento centralizas un cliente HTTP común ahí.
//
// Rutas reales expuestas por CardSortingController (prefijo global 'api'):
//   POST /api/card-sorting/sessions
//   GET  /api/card-sorting/sessions/:id
//   POST /api/card-sorting/sessions/:id/join
//   POST /api/card-sorting/sessions/:id/results

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// --- Tipos que reflejan las entidades reales del schema.prisma ---

export type TipoCardSorting = 'ABIERTO' | 'CERRADO';

export interface Card {
  id: string;
  sessionId: string;
  etiqueta: string;
  createdAt: string;
}

export interface Category {
  id: string;
  sessionId: string;
  nombre: string;
  esPredefinida: boolean;
  creadaPorParticipanteId: string | null;
  createdAt: string;
}

export interface CardGrouping {
  id: string;
  participanteSesionId: string;
  cardId: string;
  categoryId: string;
  card: Card;
  category: Category;
  createdAt: string;
}

// Forma de ResearchSession tal como la devuelve getSession/createSession
// (con los includes que ya definimos en el service). No modelamos acá
// TODOS los campos de ResearchSession, solo los que el frontend de Card
// Sorting realmente usa — evita acoplar el frontend a columnas de otras
// metodologías.
export interface CardSortingSession {
  id: string;
  proyectoId: string;
  tipo: 'CARD_SORTING';
  tipoCardSorting: TipoCardSorting | null;
  estado: 'INVITADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'ABANDONADO';
  actor: 'PARTICIPANTE' | 'EVALUADOR';
  estudioId: string | null;
  cardsDefinidas: Card[];
  categoriasDefinidas: Category[];
  agrupaciones: CardGrouping[];
  createdAt: string;
  completadoAt: string | null;
}

// --- Payloads de entrada, espejo de los DTOs Zod del backend ---

export interface CreateCardSortingSessionPayload {
  proyectoId: string;
  tipo: TipoCardSorting;
  tarjetas: string[];
  categorias?: string[];
}

export interface SubmitCardSortingGrupo {
  categoriaId?: string;
  categoriaNombre?: string;
  cardIds: string[];
}

export interface SubmitCardSortingResultPayload {
  grupos: SubmitCardSortingGrupo[];
}

// --- Manejo de errores ---
//
// Error tipado que conserva el status HTTP, para que React Query y la
// UI puedan distinguir 404 / 400 / 403 sin parsear strings.
export class CardSortingApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CardSortingApiError';
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.message ?? `Error HTTP ${res.status}`;
  } catch {
    return `Error HTTP ${res.status}`;
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new CardSortingApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (!res.ok) {
    throw new CardSortingApiError(res.status, await parseErrorMessage(res));
  }

  return res.json() as Promise<T>;
}

// --- Funciones puras exportadas ---

/**
 * Evaluador crea el estudio maestro (define tarjetas y, si aplica,
 * categorías predefinidas). Requiere sesión autenticada (cookie de
 * Usuario) — el backend exige JwtAuthGuard en esta ruta.
 */
export function createCardSortingSession(
  payload: CreateCardSortingSessionPayload,
): Promise<CardSortingSession> {
  return request<CardSortingSession>('/card-sorting/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Obtiene una sesión de Card Sorting (maestra o de participante).
 * Ruta pública en el backend.
 */
export function getCardSortingSession(
  sessionId: string,
): Promise<CardSortingSession> {
  return request<CardSortingSession>(`/card-sorting/sessions/${sessionId}`, {
    method: 'GET',
  });
}

/**
 * Participante anónimo se une a un estudio: crea su propia sesión hija.
 * Ruta pública en el backend (no requiere JWT de Usuario).
 */
export function joinCardSortingSession(
  estudioId: string,
  participanteId: string,
): Promise<CardSortingSession> {
  return request<CardSortingSession>(
    `/card-sorting/sessions/${estudioId}/join`,
    {
      method: 'POST',
      body: JSON.stringify({ participanteId }),
    },
  );
}

/**
 * Participante envía su resultado de agrupamiento. El backend deriva el
 * participanteId de la sesión en el servidor (no viaja en el body, ver
 * ADR de seguridad IDOR).
 */
export interface CardSortingFrecuenciaCategoria {
  nombre: string;
  count: number;
  porcentaje: number;
}

export interface CardSortingCluster {
  nombre: string;
  tarjetas: string[];
  acuerdo: number;
}

export interface CardSortingAnalytics {
  participantesCount: number;
  cardsCount: number;
  acuerdoGlobal: number;
  tarjetas: string[];
  matrizSimilitud: number[][];
  frecuenciaPorCategoria: CardSortingFrecuenciaCategoria[];
  clusters: CardSortingCluster[];
}

/**
 * Analítica agregada del estudio (matriz de similitud, frecuencia de
 * categorías y clústeres), calculada por el backend a partir de las
 * agrupaciones reales de los participantes completados.
 */
export function getCardSortingAnalytics(estudioId: string): Promise<CardSortingAnalytics> {
  return request<CardSortingAnalytics>(`/card-sorting/sessions/${estudioId}/analytics`, {
    method: 'GET',
  });
}

export function submitCardSortingResult(
  participanteSesionId: string,
  grupos: SubmitCardSortingGrupo[],
): Promise<CardSortingSession> {
  return request<CardSortingSession>(
    `/card-sorting/sessions/${participanteSesionId}/results`,
    {
      method: 'POST',
      body: JSON.stringify({ grupos } satisfies SubmitCardSortingResultPayload),
    },
  );
}