// apps/frontend/src/features/momentos-criticos/store/useMomentosCriticosStore.ts
//
// Solo estado de UI transitorio. El contenido de momentos críticos vive en
// TanStack Query — nunca se duplica acá.

import { create } from 'zustand';

interface MomentosCriticosState {
  selectedArtefactoId: string | null;
  // índice del incidente seleccionado en la matriz impacto/frecuencia
  // (equivalente a state.moment del prototipo).
  activeIncidenteIndex: number;
  lockedArtefactoId: string | null;

  select: (artefactoId: string) => void;
  setActiveIncidente: (index: number) => void;
  setLocked: (artefactoId: string | null) => void;
}

export const useMomentosCriticosStore = create<MomentosCriticosState>((set) => ({
  selectedArtefactoId: null,
  activeIncidenteIndex: 0,
  lockedArtefactoId: null,

  select: (artefactoId) =>
    set({ selectedArtefactoId: artefactoId, activeIncidenteIndex: 0 }),
  setActiveIncidente: (index) => set({ activeIncidenteIndex: index }),
  setLocked: (artefactoId) => set({ lockedArtefactoId: artefactoId }),
}));
