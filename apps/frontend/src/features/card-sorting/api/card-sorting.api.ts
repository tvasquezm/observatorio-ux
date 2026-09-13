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
//   POST /api/card-sorting/sessions/:id/self-results
//   POST /api/card-sorting/sessions/:id/share-link
//   GET  /api/card-sorting/sessions/public/:token
//   POST /api/card-sorting/sessions/public/:token/join

import { csrfHeaders } from '../../../shared/api/csrf';
import type {
  CreateCardSortingSessionPayload,
  SubmitCardSortingGrupo,
  SubmitCardSortingResultPayload,
  TipoCardSorting,
} from '@observatorio-ux/shared-types';

export type {
  CreateCardSortingSessionPayload,
  SubmitCardSortingGrupo,
  SubmitCardSortingResultPayload,
  TipoCardSorting,
};

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// --- Tipos que reflejan las entidades reales del schema.prisma ---

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
  nombre: string;
  tipoCardSorting: TipoCardSorting | null;
  estado: 'INVITADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'ABANDONADO';
  actor: 'PARTICIPANTE' | 'EVALUADOR';
  estudioId: string | null;
  cardsDefinidas: Card[];
  categoriasDefinidas: Category[];
  estudio?: {
    id: string;
    cardsDefinidas: Card[];
    categoriasDefinidas: Category[];
    tipoCardSorting: TipoCardSorting | null;
  } | null;
  agrupaciones: CardGrouping[];
  createdAt: string;
  completadoAt: string | null;
  cerradoAt: string | null;
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

async function request<T>(path: string, init: RequestInit, participantAuth = false): Promise<T> {
  let res: Response;

  try {
    const token = participantAuth ? localStorage.getItem('participanteToken') : null;
    res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(participantAuth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!participantAuth ? csrfHeaders(init.method) : {}),
        ...(init.headers ?? {}),
      },
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
export function listCardSortingStudies(projectId: string): Promise<CardSortingStudySummary[]> {
  return request(`/card-sorting/sessions/project/${projectId}`, { method: 'GET' });
}

export function closeCardSortingStudy(estudioId: string): Promise<CardSortingSession> {
  return request<CardSortingSession>(`/card-sorting/sessions/${estudioId}/close`, { method: 'POST' });
}

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
 * participantAuth=true agrega el Bearer token del participante.
 */
export function getCardSortingSession(
  sessionId: string,
  participantAuth = false,
): Promise<CardSortingSession> {
  return request<CardSortingSession>(`/card-sorting/sessions/${sessionId}`, {
    method: 'GET',
  }, participantAuth);
}

export interface CardSortingStudySummary {
  id: string; nombre: string; tipoCardSorting: TipoCardSorting | null;
  estado: CardSortingSession['estado']; createdAt: string; cerradoAt: string | null;
  cardsCount: number; respuestasCount: number;
}

export interface PublicCardSortingStudy {
  id: string;
  nombre: string;
  proyectoId: string;
  tipo: 'CARD_SORTING';
  tipoCardSorting: TipoCardSorting | null;
  cardsDefinidas: Card[];
  categoriasDefinidas: Category[];
  estado: CardSortingSession['estado'];
  cerradoAt: string | null;
}

export interface PublicCardSortingJoinResponse {
  access_token: string;
  session: CardSortingSession;
}

export function createCardSortingShareLink(estudioId: string): Promise<{ urlToken: string; estudioId: string }> {
  return request(`/card-sorting/sessions/${estudioId}/share-link`, {
    method: 'POST',
  });
}

export function getPublicCardSortingStudy(token: string): Promise<PublicCardSortingStudy> {
  return request(`/card-sorting/sessions/public/${encodeURIComponent(token)}`, {
    method: 'GET',
  });
}

export function joinPublicCardSortingStudy(token: string): Promise<PublicCardSortingJoinResponse> {
  return request(`/card-sorting/sessions/public/${encodeURIComponent(token)}/join`, {
    method: 'POST',
  });
}

export function submitStudentCardSortingResult(
  estudioId: string,
  grupos: SubmitCardSortingGrupo[],
): Promise<CardSortingSession> {
  return request<CardSortingSession>(
    `/card-sorting/sessions/${estudioId}/self-results`,
    {
      method: 'POST',
      body: JSON.stringify({ grupos } satisfies SubmitCardSortingResultPayload),
    },
  );
}

/**
 * Participante se une a un estudio y crea (o recupera) su propia sesión hija.
 * La petición usa el Bearer token del participante.
 */
export function joinCardSortingSession(
  estudioId: string,
): Promise<CardSortingSession> {
  return request<CardSortingSession>(
    `/card-sorting/sessions/${estudioId}/join`,
    { method: 'POST' },
    true,
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

export interface CardSortingMatrix {
  categorias: string[];
  filas: { tarjeta: string; valores: number[] }[];
}

export interface CardSortingPorCarta {
  tarjeta: string;
  categoriasCount: number;
  categorias: { nombre: string; frecuencia: number }[];
}

export interface CardSortingPorCategoria {
  nombre: string;
  cardsCount: number;
  cartas: { tarjeta: string; frecuencia: number }[];
}

export interface CardSortingAnalytics {
  estudio: { id: string; nombre: string; estado: CardSortingSession['estado']; cerradoAt: string | null; createdAt: string };
  participantesCount: number;
  cardsCount: number;
  acuerdoGlobal: number;
  tarjetas: string[];
  matrizSimilitud: number[][];
  frecuenciaPorCategoria: CardSortingFrecuenciaCategoria[];
  clusters: CardSortingCluster[];
  resultadosPorTarjeta: Array<{ tarjeta: string; categoria: string; porcentaje: number }>;
  categorias: string[];
  matrizColocacion: Array<{ categoria: string; tarjetas: number[] }>;
  resultsMatrix: CardSortingMatrix;
  popularPlacementsMatrix: CardSortingMatrix;
  porCarta: CardSortingPorCarta[];
  porCategoria: CardSortingPorCategoria[];
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
    true,
  );
}
