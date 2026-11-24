// apps/frontend/src/features/momentos-criticos/hooks/useMomentosCriticosQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCriticalMoment,
  deleteCriticalMoment,
  listCriticalMoments,
  updateCriticalMoment,
  type MomentosCriticosContenido,
} from '../api/momentos-criticos.api';

export const momentosKeys = {
  all: (proyectoId: string) => ['momentos-criticos', proyectoId] as const,
  detail: (proyectoId: string, artefactoId: string) =>
    ['momentos-criticos', proyectoId, artefactoId] as const,
};

export function useCriticalMoments(proyectoId: string | null) {
  return useQuery({
    queryKey: momentosKeys.all(proyectoId ?? ''),
    queryFn: () => listCriticalMoments(proyectoId as string),
    enabled: !!proyectoId,
  });
}

export function useCreateCriticalMoment(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contenido: MomentosCriticosContenido) =>
      createCriticalMoment(proyectoId, contenido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: momentosKeys.all(proyectoId) });
    },
  });
}

export function useUpdateCriticalMoment(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
      expectedVersion,
    }: {
      artefactoId: string;
      contenido: MomentosCriticosContenido;
      expectedVersion?: number;
    }) => updateCriticalMoment(proyectoId, artefactoId, contenido, expectedVersion),
    onSuccess: (momento) => {
      queryClient.setQueryData(
        momentosKeys.detail(proyectoId, momento.artefactoLogicoId),
        momento,
      );
      queryClient.invalidateQueries({ queryKey: momentosKeys.all(proyectoId) });
    },
  });
}

export function useDeleteCriticalMoment(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artefactoId: string) => deleteCriticalMoment(proyectoId, artefactoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: momentosKeys.all(proyectoId) });
    },
  });
}

