// apps/frontend/src/features/persona/hooks/usePersonaQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPersona,
  deletePersona,
  getPersona,
  listPersonas,
  lockPersona,
  unlockPersona,
  updatePersona,
  type PersonaContenido,
} from '../api/persona.api';

export const personaKeys = {
  all: (proyectoId: string) => ['personas', proyectoId] as const,
  detail: (proyectoId: string, artefactoId: string) =>
    ['personas', proyectoId, artefactoId] as const,
};

export function usePersonas(proyectoId: string | null) {
  return useQuery({
    queryKey: personaKeys.all(proyectoId ?? ''),
    queryFn: () => listPersonas(proyectoId as string),
    enabled: !!proyectoId,
  });
}

export function usePersona(proyectoId: string | null, artefactoId: string | null) {
  return useQuery({
    queryKey: personaKeys.detail(proyectoId ?? '', artefactoId ?? ''),
    queryFn: () => getPersona(proyectoId as string, artefactoId as string),
    enabled: !!proyectoId && !!artefactoId,
  });
}

export function useCreatePersona(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contenido: PersonaContenido) => createPersona(proyectoId, contenido),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personaKeys.all(proyectoId) });
    },
  });
}

export function useUpdatePersona(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      artefactoId,
      contenido,
    }: {
      artefactoId: string;
      contenido: PersonaContenido;
    }) => updatePersona(proyectoId, artefactoId, contenido),
    onSuccess: (persona) => {
      queryClient.setQueryData(
        personaKeys.detail(proyectoId, persona.artefactoLogicoId),
        persona,
      );
      queryClient.invalidateQueries({ queryKey: personaKeys.all(proyectoId) });
    },
  });
}

export function useDeletePersona(proyectoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artefactoId: string) => deletePersona(proyectoId, artefactoId),
    onSuccess: () => {
      // Soft delete: no hace falta remover del cache a mano, basta con
      // refetch — listPersonas ya no la traerá (deletedAt filtrado en backend).
      queryClient.invalidateQueries({ queryKey: personaKeys.all(proyectoId) });
    },
  });
}

export function useLockPersona(proyectoId: string) {
  return useMutation({
    mutationFn: ({
      artefactoId,
      ttlSegundos,
    }: {
      artefactoId: string;
      ttlSegundos?: number;
    }) => lockPersona(proyectoId, artefactoId, ttlSegundos),
  });
}

export function useUnlockPersona(proyectoId: string) {
  return useMutation({
    mutationFn: (artefactoId: string) => unlockPersona(proyectoId, artefactoId),
  });
}
