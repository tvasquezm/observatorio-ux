// apps/frontend/src/features/persona/store/usePersonaStore.ts
//
// Solo estado de UI transitorio. Los datos de personas viven en TanStack
// Query (usePersonaQueries.ts) — nunca se duplican acá.

import { create } from 'zustand';

interface PersonaState {
  // id lógico de la persona seleccionada en el switcher (persona-switch).
  selectedArtefactoId: string | null;
  // id del artefacto actualmente bloqueado por este usuario para editar.
  lockedArtefactoId: string | null;

  select: (artefactoId: string) => void;
  setLocked: (artefactoId: string | null) => void;
}

export const usePersonaStore = create<PersonaState>((set) => ({
  selectedArtefactoId: null,
  lockedArtefactoId: null,

  select: (artefactoId) => set({ selectedArtefactoId: artefactoId }),
  setLocked: (artefactoId) => set({ lockedArtefactoId: artefactoId }),
}));
