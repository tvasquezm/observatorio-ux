// apps/frontend/src/features/admin/hooks/useUsersQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDocentes,
  createDocente,
  removeDocente,
  getEstudiantes,
  UsersApiError,
  type CreateDocenteDto,
} from '../api/users.api';
import { notify } from '../../../shared/api/toast';

export const usersKeys = {
  docentes: ['users', 'docentes'] as const,
  estudiantes: (salaId?: string) => ['users', 'estudiantes', salaId ?? 'all'] as const,
};

function mensajeError(err: unknown, fallback: string) {
  return err instanceof UsersApiError ? err.message : fallback;
}

export function useDocentes() {
  return useQuery({ queryKey: usersKeys.docentes, queryFn: getDocentes });
}

export function useCreateDocente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocenteDto) => createDocente(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKeys.docentes });
      notify.success('Docente creado.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo crear el docente.')),
  });
}

export function useRemoveDocente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeDocente(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKeys.docentes });
      notify.success('Docente eliminado.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo eliminar el docente.')),
  });
}

export function useEstudiantesAdmin(salaId?: string) {
  return useQuery({
    queryKey: usersKeys.estudiantes(salaId),
    queryFn: () => getEstudiantes(salaId),
  });
}
