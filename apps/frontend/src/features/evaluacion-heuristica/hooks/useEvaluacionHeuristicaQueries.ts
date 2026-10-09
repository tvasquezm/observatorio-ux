// apps/frontend/src/features/evaluacion-heuristica/hooks/useEvaluacionHeuristicaQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarHallazgo,
  crearSesionHeuristica,
  eliminarHallazgo,
  finalizarSesionHeuristica,
  listarSesionesHeuristicas,
  obtenerAnaliticaHeuristica,
  obtenerEvidenciaBlob,
  obtenerSesionHeuristica,
  registrarHallazgo,
  subirEvidencia,
  type EvaluacionHeuristicaSesion,
  type HallazgoHeuristicaInput,
} from '../api/evaluacion-heuristica.api';

export const heuristicaKeys = {
  list: (proyectoId: string) => ['evaluacion-heuristica', proyectoId, 'sesiones'] as const,
  detail: (proyectoId: string, sesionId: string) => ['evaluacion-heuristica', proyectoId, sesionId] as const,
  analytics: (proyectoId: string) => ['evaluacion-heuristica', proyectoId, 'analytics'] as const,
  evidencia: (proyectoId: string, sesionId: string, evidenciaId: string) =>
    ['evaluacion-heuristica', proyectoId, sesionId, 'evidencia', evidenciaId] as const,
};

export function useAnaliticaHeuristica(proyectoId: string) {
  return useQuery({
    queryKey: heuristicaKeys.analytics(proyectoId),
    queryFn: () => obtenerAnaliticaHeuristica(proyectoId),
    enabled: !!proyectoId,
  });
}

export function useSesionesHeuristicas(proyectoId: string) {
  return useQuery({
    queryKey: heuristicaKeys.list(proyectoId),
    queryFn: () => listarSesionesHeuristicas(proyectoId),
    enabled: !!proyectoId,
  });
}

export function useCrearSesionHeuristica(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nombre?: string) => crearSesionHeuristica(proyectoId, nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: heuristicaKeys.list(proyectoId) });
      qc.invalidateQueries({ queryKey: heuristicaKeys.analytics(proyectoId) });
    },
  });
}

export function useSesionHeuristica(proyectoId: string, sesionId: string | null) {
  return useQuery({
    queryKey: heuristicaKeys.detail(proyectoId, sesionId ?? ''),
    queryFn: () => obtenerSesionHeuristica(proyectoId, sesionId as string),
    enabled: !!sesionId,
  });
}

// Tras cualquier cambio en una sesión: refresca su detalle, el listado
// (informe/PDF) y la analítica agregada.
function useAlGuardarSesion(proyectoId: string) {
  const qc = useQueryClient();
  return (s: EvaluacionHeuristicaSesion) => {
    qc.setQueryData(heuristicaKeys.detail(proyectoId, s.id), s);
    qc.invalidateQueries({ queryKey: heuristicaKeys.list(proyectoId) });
    qc.invalidateQueries({ queryKey: heuristicaKeys.analytics(proyectoId) });
  };
}

export function useRegistrarHallazgo(proyectoId: string) {
  const alGuardar = useAlGuardarSesion(proyectoId);
  return useMutation({
    mutationFn: ({ sesionId, hallazgo }: { sesionId: string; hallazgo: HallazgoHeuristicaInput }) =>
      registrarHallazgo(proyectoId, sesionId, hallazgo),
    onSuccess: alGuardar,
  });
}

export function useActualizarHallazgo(proyectoId: string) {
  const alGuardar = useAlGuardarSesion(proyectoId);
  return useMutation({
    mutationFn: ({
      sesionId,
      hallazgoId,
      cambios,
    }: {
      sesionId: string;
      hallazgoId: string;
      cambios: Partial<HallazgoHeuristicaInput>;
    }) => actualizarHallazgo(proyectoId, sesionId, hallazgoId, cambios),
    onSuccess: alGuardar,
  });
}

export function useEliminarHallazgo(proyectoId: string) {
  const alGuardar = useAlGuardarSesion(proyectoId);
  return useMutation({
    mutationFn: ({ sesionId, hallazgoId }: { sesionId: string; hallazgoId: string }) =>
      eliminarHallazgo(proyectoId, sesionId, hallazgoId),
    onSuccess: alGuardar,
  });
}

export function useFinalizarSesionHeuristica(proyectoId: string) {
  const alGuardar = useAlGuardarSesion(proyectoId);
  return useMutation({
    mutationFn: (sesionId: string) => finalizarSesionHeuristica(proyectoId, sesionId),
    onSuccess: alGuardar,
  });
}

export function useSubirEvidencia(proyectoId: string) {
  return useMutation({
    mutationFn: ({ sesionId, archivo }: { sesionId: string; archivo: File }) =>
      subirEvidencia(proyectoId, sesionId, archivo),
  });
}

/** La captura se pide como Blob autenticado (la cookie viaja; un <img src> directo no sirve con otro origen). */
export function useEvidenciaBlob(proyectoId: string, sesionId: string, evidenciaId: string | null | undefined) {
  return useQuery({
    queryKey: heuristicaKeys.evidencia(proyectoId, sesionId, evidenciaId ?? ''),
    queryFn: () => obtenerEvidenciaBlob(proyectoId, sesionId, evidenciaId as string),
    enabled: !!evidenciaId,
    staleTime: Infinity,
    retry: false,
  });
}
