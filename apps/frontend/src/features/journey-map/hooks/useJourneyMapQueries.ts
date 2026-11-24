// apps/frontend/src/features/journey-map/hooks/useJourneyMapQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createJourney,
  listJourneys,
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

export function useCreateJourney(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contenido: JourneyMapContenido) => createJourney(proyectoId, contenido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeyKeys.all(proyectoId) });
    },
  });
}

