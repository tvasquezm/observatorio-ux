// apps/frontend/src/features/persona/hooks/usePersonaQueries.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPersona,
  deletePersona,
  listPersonas,
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
      expectedVersion,
    }: {
      artefactoId: string;
      contenido: PersonaContenido;
      expectedVersion?: number;
    }) => updatePersona(proyectoId, artefactoId, contenido, expectedVersion),
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

