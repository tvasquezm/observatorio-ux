// apps/frontend/src/features/journey-map/hooks/useJourneyMapQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createJourney,
  deleteJourney,
  getJourney,
  listJourneys,
  lockJourney,
  unlockJourney,
  updateJourney,
  type JourneyMapContenido,
} from '../api/journey-map.api';

export const journeyKeys = {
  all: (proyectoId: string) => ['journeys', proyectoId] as const,
  detail: (proyectoId: string, artefactoId: string) =>
    ['journeys', proyectoId, artefactoId] as const,
};

export function useJourneys(proyectoId: string | null) {
  return useQuery({
    queryKey: journeyKeys.all(proyectoId ?? ''),
    queryFn: () => listJourneys(proyectoId as string),
    enabled: !!proyectoId,
  });
}

export function useJourney(proyectoId: string | null, artefactoId: string | null) {
  return useQuery({
    queryKey: journeyKeys.detail(proyectoId ?? '', artefactoId ?? ''),
    queryFn: () => getJourney(proyectoId as string, artefactoId as string),
    enabled: !!proyectoId && !!artefactoId,
  });
}

export function useCreateJourney(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contenido: JourneyMapContenido) => createJourney(proyectoId, contenido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeyKeys.all(proyectoId) });
    },
  });
}

export function useUpdateJourney(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
    }: {
      artefactoId: string;
      contenido: JourneyMapContenido;
    }) => updateJourney(proyectoId, artefactoId, contenido),
    onSuccess: (journey) => {
      queryClient.setQueryData(
        journeyKeys.detail(proyectoId, journey.artefactoLogicoId),
        journey,
      );
      queryClient.invalidateQueries({ queryKey: journeyKeys.all(proyectoId) });
    },
  });
}

export function useDeleteJourney(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artefactoId: string) => deleteJourney(proyectoId, artefactoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeyKeys.all(proyectoId) });
    },
  });
}

export function useLockJourney(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      ttlSegundos,
    }: {
      artefactoId: string;
      ttlSegundos?: number;
    }) => lockJourney(proyectoId, artefactoId, ttlSegundos),
  });
}

export function useUnlockJourney(proyectoId: string) {
  return useMutation({
    mutationFn: (artefactoId: string) => unlockJourney(proyectoId, artefactoId),
  });
}
