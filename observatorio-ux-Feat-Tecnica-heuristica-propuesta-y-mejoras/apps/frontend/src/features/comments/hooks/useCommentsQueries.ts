// apps/frontend/src/features/comments/hooks/useCommentsQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listComments,
  createComment,
  updateComment,
  removeComment,
  CommentsApiError,
} from '../api/comments.api';
import { notify } from '../../../shared/api/toast';

export const commentsKeys = {
  list: (proyectoId: string) => ['projects', proyectoId, 'comments'] as const,
};

function mensajeError(err: unknown, fallback: string) {
  return err instanceof CommentsApiError ? err.message : fallback;
}

export function useComments(proyectoId: string | null) {
  return useQuery({
    queryKey: commentsKeys.list(proyectoId ?? ''),
    queryFn: () => listComments(proyectoId as string),
    enabled: !!proyectoId,
  });
}

export function useCreateComment(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (texto: string) => createComment(proyectoId, texto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKeys.list(proyectoId) });
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo publicar el comentario.'));
    },
  });
}

export function useUpdateComment(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ comentarioId, texto }: { comentarioId: string; texto: string }) =>
      updateComment(proyectoId, comentarioId, texto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKeys.list(proyectoId) });
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo editar el comentario.'));
    },
  });
}

export function useRemoveComment(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comentarioId: string) => removeComment(proyectoId, comentarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKeys.list(proyectoId) });
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo borrar el comentario.'));
    },
  });
}
