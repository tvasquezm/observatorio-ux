import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store/useAuthStore';
import { analiticaHeuristica } from './analitica';
import { listarEvaluaciones } from './flujo.api';

/** Comparte la caché de la lista de evaluaciones de la página de Evaluación Heurística. */
export function useAnaliticaHeuristica(proyectoId: string) {
  const usuarioId = useAuthStore((s) => s.user?.id ?? '');
  return useQuery({
    queryKey: ['heuristica-flujo', proyectoId, usuarioId, 'evaluaciones'],
    queryFn: () => listarEvaluaciones(proyectoId),
    select: analiticaHeuristica,
    enabled: !!proyectoId,
  });
}
