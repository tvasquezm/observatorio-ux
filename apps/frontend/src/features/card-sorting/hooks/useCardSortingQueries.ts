// apps/frontend/src/features/card-sorting/hooks/useCardSortingQueries.ts
//
// Capa de integración con TanStack Query. Aislamiento: solo importa
// desde ../api, dentro de la misma feature.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCardSortingSession,
  getCardSortingAnalytics,
  getCardSortingSession,
  getCardSortingSessionByProyecto,
  getCardSortingEstudiosByProyecto,
  cerrarCardSortingEstudio,
  type CreateCardSortingSessionPayload,
} from '../api/card-sorting.api';

// Query keys centralizadas para evitar strings sueltos repetidos y
// facilitar invalidaciones consistentes.
export const cardSortingKeys = {
  all: ['card-sorting'] as const,
  session: (id: string) => ['card-sorting', 'session', id] as const,
  byProyecto: (proyectoId: string) => ['card-sorting', 'proyecto', proyectoId] as const,
  todosByProyecto: (proyectoId: string) => ['card-sorting', 'proyecto', proyectoId, 'todos'] as const,
  analytics: (id: string) => ['card-sorting', 'analytics', id] as const,
};

/**
 * Estudio maestro ya existente para el proyecto actual (si lo hay).
 * Se usa para restaurar CardSortingPage al recargar/reentrar.
 */
export function useCardSortingSessionByProyecto(proyectoId: string | null) {
  return useQuery({
    queryKey: cardSortingKeys.byProyecto(proyectoId ?? ''),
    queryFn: () => getCardSortingSessionByProyecto(proyectoId as string),
    enabled: !!proyectoId,
  });
}
/**
 * Todos los estudios maestros ya creados para el proyecto actual (no
 * solo el más reciente). El proyecto puede tener varios estudios de
 * Card Sorting en paralelo.
 */
export function useCardSortingEstudiosByProyecto(proyectoId: string | null) {
  return useQuery({
    queryKey: cardSortingKeys.todosByProyecto(proyectoId ?? ''),
    queryFn: () => getCardSortingEstudiosByProyecto(proyectoId as string),
    enabled: !!proyectoId,
  });
}

/**
 * Analítica agregada del estudio (matriz de similitud, frecuencia,
 * clústeres). `enabled` se controla desde afuera porque solo tiene
 * sentido pedirla una vez el estudio ya existe.
 */
export function useCardSortingAnalytics(estudioId: string | null) {
  return useQuery({
    queryKey: cardSortingKeys.analytics(estudioId ?? ''),
    queryFn: () => getCardSortingAnalytics(estudioId as string),
    enabled: !!estudioId,
  });
}
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
      queryClient.setQueryData(cardSortingKeys.byProyecto(session.proyectoId), session);
      // El proyecto puede tener varios estudios en paralelo — invalida la
      // lista completa para que el nuevo estudio aparezca en el selector.
      queryClient.invalidateQueries({
        queryKey: cardSortingKeys.todosByProyecto(session.proyectoId),
      });
    },
  });
}

/**
 * Evaluador cierra/reabre el estudio maestro (bloquea nuevos join/submit
 * de participantes).
 */
export function useCerrarCardSortingEstudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estudioId, cerrado }: { estudioId: string; cerrado: boolean }) =>
      cerrarCardSortingEstudio(estudioId, cerrado),
    onSuccess: (session) => {
      queryClient.setQueryData(cardSortingKeys.session(session.id), session);
      queryClient.setQueryData(cardSortingKeys.byProyecto(session.proyectoId), session);
      queryClient.invalidateQueries({
        queryKey: cardSortingKeys.todosByProyecto(session.proyectoId),
      });
    },
  });
}
// Card Sorting evaluator queries end here.
