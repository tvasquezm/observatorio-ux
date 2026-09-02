// apps/frontend/src/features/journey-map/hooks/useJourneyMapQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addPhase,
  createJourney,
  deleteJourney,
  getJourney,
  listJourneys,
  lockJourney,
  removePhase,
  replacePhase,
  unlockJourney,
  updateJourney,
  type JourneyMapContenido,
  type Phase,
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

// --- Etapas: no son endpoint propio. Se resuelven client-side sobre el ---
// --- contenido ya cargado, y se persisten con useUpdateJourney. ---

export function useCreateStage(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
      phase,
    }: {
      artefactoId: string;
      contenido: JourneyMapContenido;
      phase: Phase;
    }) => updateJourney(proyectoId, artefactoId, addPhase(contenido, phase)),
  });
}

export function useUpdateStage(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
      index,
      phase,
    }: {
      artefactoId: string;
      contenido: JourneyMapContenido;
      index: number;
      phase: Phase;
    }) => updateJourney(proyectoId, artefactoId, replacePhase(contenido, index, phase)),
  });
}

export function useDeleteStage(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
      index,
    }: {
      artefactoId: string;
      contenido: JourneyMapContenido;
      index: number;
    }) => {
      if (contenido.fases.length <= 3) {
        // JourneyMapSchema exige mínimo 3 fases: fallar rápido en el
        // cliente en vez de mandar un request que el backend rechazará.
        return Promise.reject(
          new Error('El Journey Map debe conservar al menos 3 etapas.'),
        );
      }
      return updateJourney(proyectoId, artefactoId, removePhase(contenido, index));
    },
  });
}
