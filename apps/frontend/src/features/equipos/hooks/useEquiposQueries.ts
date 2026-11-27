// apps/frontend/src/features/equipos/hooks/useEquiposQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listEquipos,
  createEquipo,
  updateEquipo,
  removeEquipo,
  addMiembroEquipo,
  removeMiembroEquipo,
  listAccesosPendientes,
  listHistorialAccesos,
  resolverAccesoPendiente,
  EquiposApiError,
} from '../api/equipos.api';
import { notify } from '../../../shared/api/toast';

export const equiposKeys = {
  list: (salaId: string) => ['salas', salaId, 'equipos'] as const,
  accesosPendientes: (salaId: string) => ['salas', salaId, 'accesos-pendientes'] as const,
  historialAccesos: (salaId: string) => ['salas', salaId, 'accesos-pendientes', 'historial'] as const,
};

function mensajeError(err: unknown, fallback: string) {
  return err instanceof EquiposApiError ? err.message : fallback;
}

export function useEquipos(salaId: string | null) {
  return useQuery({
    queryKey: equiposKeys.list(salaId ?? ''),
    queryFn: () => listEquipos(salaId as string),
    enabled: !!salaId,
  });
}

/** Personas que salieron de un equipo y esperan que el docente decida sobre su acceso a los proyectos. */
export function useAccesosPendientes(salaId: string | null) {
  return useQuery({
    queryKey: equiposKeys.accesosPendientes(salaId ?? ''),
    queryFn: () => listAccesosPendientes(salaId as string),
    enabled: !!salaId,
  });
}

export function useHistorialAccesos(salaId: string | null, abierto: boolean) {
  return useQuery({
    queryKey: equiposKeys.historialAccesos(salaId ?? ''),
    queryFn: () => listHistorialAccesos(salaId as string),
    enabled: !!salaId && abierto,
  });
}

export function useResolverAcceso(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ revisionId, decision }: { revisionId: string; decision: 'QUITAR' | 'MANTENER' }) =>
      resolverAccesoPendiente(salaId, revisionId, decision),
    onSuccess: (_r, { decision }) => {
      qc.invalidateQueries({ queryKey: equiposKeys.accesosPendientes(salaId) });
      notify.success(decision === 'QUITAR' ? 'Se quitó el acceso a los proyectos.' : 'Se mantiene el acceso a los proyectos.');
    },
    onError: (err) => notify.error(mensajeError(err, 'No se pudo guardar la decisión.')),
  });
}

export function useCreateEquipo(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nombre: string) => createEquipo(salaId, nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equiposKeys.list(salaId) });
      notify.success('Equipo creado.');
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo crear el equipo.'));
    },
  });
}

export function useUpdateEquipo(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipoId, nombre }: { equipoId: string; nombre: string }) =>
      updateEquipo(salaId, equipoId, nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equiposKeys.list(salaId) });
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo renombrar el equipo.'));
    },
  });
}

export function useRemoveEquipo(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (equipoId: string) => removeEquipo(salaId, equipoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equiposKeys.list(salaId) });
      qc.invalidateQueries({ queryKey: equiposKeys.accesosPendientes(salaId) });
      notify.success('Equipo eliminado.');
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo eliminar el equipo.'));
    },
  });
}

export function useAddMiembroEquipo(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipoId, email }: { equipoId: string; email: string }) =>
      addMiembroEquipo(salaId, equipoId, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equiposKeys.list(salaId) });
      notify.success('Integrante agregado.');
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo agregar al integrante.'));
    },
  });
}

export function useRemoveMiembroEquipo(salaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ equipoId, usuarioId }: { equipoId: string; usuarioId: string }) =>
      removeMiembroEquipo(salaId, equipoId, usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equiposKeys.list(salaId) });
      qc.invalidateQueries({ queryKey: equiposKeys.accesosPendientes(salaId) });
    },
    onError: (err) => {
      notify.error(mensajeError(err, 'No se pudo quitar al integrante.'));
    },
  });
}
