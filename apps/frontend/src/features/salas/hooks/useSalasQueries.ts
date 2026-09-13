// apps/frontend/src/features/salas/hooks/useSalasQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listEstudiantes,
  addEstudiante,
  addEstudiantesBulk,
  updateEstudiante,
  removeEstudiante,
  listProyectosDeSala,
  getSala,
  vincularProyecto,
  desvincularProyecto,
  SalasApiError,
  type SalaEstudiante,
  type SalaEstudianteInput,
  type ProyectoEnSala,
} from '../api/salas.api';
import { notify } from '../../../shared/api/toast';

export const salasKeys = {
  detail: (salaId: string) => ['salas', salaId] as const,
  estudiantes: (salaId: string) => ['salas', salaId, 'estudiantes'] as const,
  proyectos: (salaId: string) => ['salas', salaId, 'proyectos'] as const,
};

function mensajeError(err: unknown, fallback: string) {
  return err instanceof SalasApiError ? err.message : fallback;
}

export function useSala(salaId: string | null) {
  return useQuery({
    queryKey: salasKeys.detail(salaId ?? ''),
    queryFn: () => getSala(salaId as string),
    enabled: !!salaId,
  });
}

// --- Estudiantes ---

export function useEstudiantes(salaId: string | null) {
  return useQuery<SalaEstudiante[]>({
    queryKey: salasKeys.estudiantes(salaId ?? ''),
    queryFn: () => listEstudiantes(salaId as string),
    enabled: !!salaId,
  });
}

export function useAddEstudiante(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SalaEstudianteInput) => addEstudiante(salaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salasKeys.estudiantes(salaId) });
      notify.success('Estudiante agregado.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo agregar al estudiante.')),
  });
}

export function useAddEstudiantesBulk(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (estudiantes: SalaEstudianteInput[]) => addEstudiantesBulk(salaId, estudiantes),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: salasKeys.estudiantes(salaId) });
      notify.success(
        res.agregados === res.enviados
          ? `${res.agregados} estudiante(s) agregado(s).`
          : `${res.agregados} de ${res.enviados} agregado(s) — el resto ya estaba en la sala.`,
      );
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo agregar a los estudiantes.')),
  });
}

export function useUpdateEstudiante(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SalaEstudianteInput> }) =>
      updateEstudiante(salaId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salasKeys.estudiantes(salaId) });
      notify.success('Estudiante actualizado.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo actualizar al estudiante.')),
  });
}

export function useRemoveEstudiante(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (estudianteId: string) => removeEstudiante(salaId, estudianteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salasKeys.estudiantes(salaId) });
      notify.success('Estudiante eliminado.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo eliminar al estudiante.')),
  });
}

// --- Proyectos alojados en la sala ---

export function useProyectosDeSala(salaId: string | null) {
  return useQuery<ProyectoEnSala[]>({
    queryKey: salasKeys.proyectos(salaId ?? ''),
    queryFn: () => listProyectosDeSala(salaId as string),
    enabled: !!salaId,
  });
}

export function useVincularProyecto(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proyectoId: string) => vincularProyecto(salaId, proyectoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salasKeys.proyectos(salaId) });
      notify.success('Proyecto vinculado a la sala.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo vincular el proyecto.')),
  });
}

export function useDesvincularProyecto(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proyectoId: string) => desvincularProyecto(salaId, proyectoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salasKeys.proyectos(salaId) });
      notify.success('Proyecto desvinculado de la sala.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo desvincular el proyecto.')),
  });
}
