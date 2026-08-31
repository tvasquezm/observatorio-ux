// apps/frontend/src/features/evaluacion-heuristica/hooks/useEvaluacionHeuristicaQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  crearSesionHeuristica,
  finalizarSesionHeuristica,
  obtenerSesionHeuristica,
  registrarHallazgo,
  type HallazgoHeuristica,
} from '../api/evaluacion-heuristica.api';

export const heuristicaKeys = {
  detail: (proyectoId: string, sesionId: string) => ['evaluacion-heuristica', proyectoId, sesionId] as const,
};

export function useCrearSesionHeuristica(proyectoId: string) {
  return useMutation({ mutationFn: () => crearSesionHeuristica(proyectoId) });
}

export function useSesionHeuristica(proyectoId: string, sesionId: string | null) {
  return useQuery({
    queryKey: heuristicaKeys.detail(proyectoId, sesionId ?? ''),
    queryFn: () => obtenerSesionHeuristica(proyectoId, sesionId as string),
    enabled: !!sesionId,
  });
}

export function useRegistrarHallazgo(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sesionId, hallazgo }: { sesionId: string; hallazgo: HallazgoHeuristica }) =>
      registrarHallazgo(proyectoId, sesionId, hallazgo),
    onSuccess: (s) => qc.setQueryData(heuristicaKeys.detail(proyectoId, s.id), s),
  });
}

export function useFinalizarSesionHeuristica(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sesionId: string) => finalizarSesionHeuristica(proyectoId, sesionId),
    onSuccess: (s) => qc.setQueryData(heuristicaKeys.detail(proyectoId, s.id), s),
  });
}
