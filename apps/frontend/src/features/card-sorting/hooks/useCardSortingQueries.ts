// apps/frontend/src/features/card-sorting/hooks/useCardSortingQueries.ts
//
// Capa de integración con TanStack Query. Aislamiento: solo importa
// desde ../api y ../store, ambos dentro de la misma feature.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CardSortingApiError,
  createCardSortingSession,
  getCardSortingSession,
  joinCardSortingSession,
  submitCardSortingResult,
  type CreateCardSortingSessionPayload,
  type SubmitCardSortingGrupo,
} from '../api/card-sorting.api';
import { useCardSortingStore } from '../store/useCardSortingStore';

// Query keys centralizadas para evitar strings sueltos repetidos y
// facilitar invalidaciones consistentes.
export const cardSortingKeys = {
  all: ['card-sorting'] as const,
  session: (id: string) => ['card-sorting', 'session', id] as const,
};

/**
 * Lee una sesión de Card Sorting (maestra o de participante).
 * `enabled` controla si dispara la query (útil para no pedir datos
 * antes de tener un id real, ej. antes del join).
 */
export function useCardSortingSession(sessionId: string | null) {
  return useQuery({
    queryKey: cardSortingKeys.session(sessionId ?? ''),
    queryFn: () => getCardSortingSession(sessionId as string),
    enabled: !!sessionId,
  });
}

/**
 * Evaluador crea el estudio maestro. Ruta protegida por JwtAuthGuard en
 * el backend — el fetch va con credentials: 'include', así que la
 * cookie de sesión del evaluador debe estar seteada.
 */
export function useCreateCardSortingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCardSortingSessionPayload) =>
      createCardSortingSession(payload),
    onSuccess: (session) => {
      // Precarga la cache de detalle para que un getSession inmediato
      // posterior no tenga que volver a pegarle a la red.
      queryClient.setQueryData(cardSortingKeys.session(session.id), session);
    },
  });
}

/**
 * Participante anónimo se une a un estudio. Al tener éxito, guarda el
 * sessionId propio en el store de Zustand — ese id es el que se usa
 * después para el submit.
 */
export function useJoinCardSortingSession() {
  const queryClient = useQueryClient();
  const setParticipantSession = useCardSortingStore(
    (s) => s.setParticipantSession,
  );

  return useMutation({
    mutationFn: ({
      estudioId,
      participanteId,
    }: {
      estudioId: string;
      participanteId: string;
    }) => joinCardSortingSession(estudioId, participanteId),
    onSuccess: (session, variables) => {
      setParticipantSession(variables.estudioId, session.id);
      queryClient.setQueryData(cardSortingKeys.session(session.id), session);
    },
  });
}

/**
 * Participante envía su resultado final. Usa el participantSessionId
 * que ya está en el store (no hay que volver a pasarlo desde el
 * componente que llama al mutate).
 */
export function useSubmitCardSortingResult() {
  const queryClient = useQueryClient();
  const participantSessionId = useCardSortingStore(
    (s) => s.participantSessionId,
  );
  const clearParticipantSession = useCardSortingStore(
    (s) => s.clearParticipantSession,
  );

  return useMutation({
    mutationFn: (grupos: SubmitCardSortingGrupo[]) => {
      if (!participantSessionId) {
        // Falla rápido y explícito en vez de mandar un submit a
        // "undefined" que el backend rechazaría con un 404 confuso.
        return Promise.reject(
          new CardSortingApiError(
            0,
            'No hay una sesión de participante activa. Debes unirte al estudio (join) antes de enviar resultados.',
          ),
        );
      }
      return submitCardSortingResult(participantSessionId, grupos);
    },
    onSuccess: (session) => {
      queryClient.setQueryData(cardSortingKeys.session(session.id), session);
      // La sesión quedó COMPLETADO en el backend — limpiamos el store
      // para que un refresh accidental no reintente un submit sobre
      // una sesión ya cerrada.
      clearParticipantSession();
    },
  });
}