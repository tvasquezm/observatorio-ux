// apps/frontend/src/features/projects/hooks/useProjectsQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  listMembers,
  addMember,
  removeMember,
  ProjectsApiError,
  type MiembroProyecto,
} from '../api/projects.api';
import { notify } from '../../../shared/api/toast';

export const projectsKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  members: (id: string) => ['projects', id, 'miembros'] as const,
};

export function useProjects() {
  return useQuery({ queryKey: projectsKeys.all, queryFn: listProjects });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: projectsKeys.detail(id ?? ''),
    queryFn: () => getProject(id as string),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nombre, descripcion }: { nombre: string; descripcion?: string }) =>
      createProject(nombre, descripcion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKeys.all });
      notify.success('Proyecto creado.');
    },
    onError: (err) => {
      notify.error(err instanceof ProjectsApiError ? err.message : 'No se pudo crear el proyecto.');
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nombre?: string; descripcion?: string } }) =>
      updateProject(id, data),
    onSuccess: (p) => {
      qc.setQueryData(projectsKeys.detail(p.id), p);
      qc.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useMembers(proyectoId: string | null) {
  return useQuery<MiembroProyecto[]>({
    queryKey: projectsKeys.members(proyectoId ?? ''),
    queryFn: () => listMembers(proyectoId as string),
    enabled: !!proyectoId,
  });
}

export function useAddMember(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => addMember(proyectoId, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKeys.members(proyectoId) });
      notify.success('Miembro agregado.');
    },
    onError: (err) => {
      notify.error(err instanceof ProjectsApiError ? err.message : 'No se pudo agregar al miembro.');
    },
  });
}

export function useRemoveMember(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (usuarioId: string) => removeMember(proyectoId, usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectsKeys.members(proyectoId) });
      notify.success('Miembro quitado.');
    },
    onError: (err) => {
      notify.error(err instanceof ProjectsApiError ? err.message : 'No se pudo quitar al miembro.');
    },
  });
}
