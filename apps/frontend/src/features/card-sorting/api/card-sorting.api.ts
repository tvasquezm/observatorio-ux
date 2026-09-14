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
  nombre: string;
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
  // Fase: cierre de estudio — solo tiene sentido en el estudio maestro.
  cerrado: boolean;
  respuestasCount?: number;
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
      headers: {
        'Content-Type': 'application/json',
        // Solo pega para las llamadas de EVALUADOR (createCardSortingSession):
        // getCsrfToken() no encuentra la cookie `csrfToken` en el flujo de
        // PARTICIPANTE (nunca se emite ahí), así que en esos casos esto no
        // agrega nada — inofensivo.
        ...csrfHeaders(init.method),
      },
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
 * Estudio maestro ya existente para un proyecto (si lo hay). Permite
 * restaurar la pantalla del evaluador al recargar o volver a entrar,
 * sin depender solo del resultado en memoria de createSession.
 */
export function getCardSortingSessionByProyecto(
  proyectoId: string,
): Promise<CardSortingSession | null> {
  return request<CardSortingSession | null>(
    `/card-sorting/sessions?proyectoId=${proyectoId}`,
    { method: 'GET' },
  );
}

/**
 * Todos los estudios maestros ya creados para un proyecto (no solo el
 * más reciente) — permite al evaluador tener varios estudios de Card
 * Sorting en paralelo para el mismo proyecto.
 */
export function getCardSortingEstudiosByProyecto(
  proyectoId: string,
): Promise<CardSortingSession[]> {
  return request<CardSortingSession[]>(
    `/card-sorting/sessions/proyecto/${proyectoId}/todos`,
    { method: 'GET' },
  );
}

/**
 * Evaluador cierra (o reabre) el estudio maestro: bloquea nuevos
 * join/submit de participantes sin borrar nada.
 */
export function cerrarCardSortingEstudio(
  estudioId: string,
  cerrado: boolean,
): Promise<CardSortingSession> {
  return request<CardSortingSession>(`/card-sorting/sessions/${estudioId}/cerrar`, {
    method: 'PATCH',
    body: JSON.stringify({ cerrado }),
  });
}

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
  filas: Array<{ tarjeta: string; valores: number[] }>;
}

export interface CardSortingPorCarta {
  tarjeta: string;
  categoriasCount: number;
  categorias: Array<{ nombre: string; frecuencia: number }>;
}

export interface CardSortingPorCategoria {
  nombre: string;
  cardsCount: number;
  cartas: Array<{ tarjeta: string; frecuencia: number }>;
}

export interface CardSortingAnalytics {
  estudio: {
    id: string;
    proyectoId: string;
    nombre: string;
    cerrado: boolean;
    createdAt: string;
  };
  participantesCount: number;
  cardsCount: number;
  acuerdoGlobal: number;
  tarjetas: string[];
  matrizSimilitud: number[][];
  frecuenciaPorCategoria: CardSortingFrecuenciaCategoria[];
  clusters: CardSortingCluster[];
  categorias: string[];
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
