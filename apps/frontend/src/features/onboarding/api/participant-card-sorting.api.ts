// apps/frontend/src/features/onboarding/api/participant-card-sorting.api.ts
//
// Llamadas de PARTICIPANTE a los endpoints de card-sorting. Usa apiFetch
// (Bearer participanteToken desde sessionStorage), NO el cliente de
// features/card-sorting/api (ese usa cookie de EVALUADOR).

import { apiFetch } from '../../../shared/api/api-client';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface ParticipantCard {
  id: string;
  etiqueta: string;
}

export interface ParticipantCategoria {
  id: string;
  nombre: string;
}

export interface ParticipantCardSortingSession {
  id: string;
  estado: 'INVITADO' | 'EN_PROGRESO' | 'COMPLETADO';
  estudio: {
    id: string;
    nombre: string;
    tipoCardSorting: 'ABIERTO' | 'CERRADO';
    cerrado: boolean;
    cardsDefinidas: ParticipantCard[];
    categoriasDefinidas: ParticipantCategoria[];
  };
}

export function joinCardSortingSession(
  estudioId: string,
): Promise<ParticipantCardSortingSession> {
  return apiFetch<ParticipantCardSortingSession>(
    `${API_BASE}/card-sorting/sessions/${estudioId}/join`,
    { method: 'POST' },
  );
}

export function getParticipantCardSortingSession(
  sesionId: string,
): Promise<ParticipantCardSortingSession> {
  return apiFetch<ParticipantCardSortingSession>(`${API_BASE}/card-sorting/sessions/${sesionId}`);
}

export interface GrupoResultado {
  categoriaId?: string;
  categoriaNombre?: string;
  cardIds: string[];
}

export function submitCardSortingResult(
  sesionId: string,
  grupos: GrupoResultado[],
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`${API_BASE}/card-sorting/sessions/${sesionId}/results`, {
    method: 'POST',
    body: JSON.stringify({ grupos }),
  });
}
