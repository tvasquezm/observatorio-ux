// apps/frontend/src/features/momentos-criticos/hooks/useMomentosCriticosQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addIncidente,
  createCriticalMoment,
  deleteCriticalMoment,
  getCriticalMoment,
  listCriticalMoments,
  lockCriticalMoment,
  removeIncidente,
  replaceIncidente,
  unlockCriticalMoment,
  updateCriticalMoment,
  type IncidenteCritico,
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

export function useCriticalMoment(proyectoId: string | null, artefactoId: string | null) {
  return useQuery({
    queryKey: momentosKeys.detail(proyectoId ?? '', artefactoId ?? ''),
    queryFn: () => getCriticalMoment(proyectoId as string, artefactoId as string),
    enabled: !!proyectoId && !!artefactoId,
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
    }: {
      artefactoId: string;
      contenido: MomentosCriticosContenido;
    }) => updateCriticalMoment(proyectoId, artefactoId, contenido),
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

export function useLockCriticalMoment(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      ttlSegundos,
    }: {
      artefactoId: string;
      ttlSegundos?: number;
    }) => lockCriticalMoment(proyectoId, artefactoId, ttlSegundos),
  });
}

export function useUnlockCriticalMoment(proyectoId: string) {
  return useMutation({
    mutationFn: (artefactoId: string) => unlockCriticalMoment(proyectoId, artefactoId),
  });
}

// --- Incidentes: sub-elemento de incidentes[], se resuelven client-side. ---

export function useCreateIncidente(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
      incidente,
    }: {
      artefactoId: string;
      contenido: MomentosCriticosContenido;
      incidente: IncidenteCritico;
    }) => updateCriticalMoment(proyectoId, artefactoId, addIncidente(contenido, incidente)),
  });
}

export function useUpdateIncidente(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
      index,
      incidente,
    }: {
      artefactoId: string;
      contenido: MomentosCriticosContenido;
      index: number;
      incidente: IncidenteCritico;
    }) =>
      updateCriticalMoment(
        proyectoId,
        artefactoId,
        replaceIncidente(contenido, index, incidente),
      ),
  });
}

export function useDeleteIncidente(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
      index,
    }: {
      artefactoId: string;
      contenido: MomentosCriticosContenido;
      index: number;
    }) => {
      if (contenido.incidentes.length <= 1) {
        return Promise.reject(
          new Error('Debe quedar al menos un incidente crítico en la matriz.'),
        );
      }
      return updateCriticalMoment(proyectoId, artefactoId, removeIncidente(contenido, index));
    },
  });
}
