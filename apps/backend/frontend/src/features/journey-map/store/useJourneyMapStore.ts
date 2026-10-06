// apps/frontend/src/features/journey-map/store/useJourneyMapStore.ts
//
// Solo estado de UI transitorio. El contenido del journey vive en TanStack
// Query — nunca se duplica acá.

import { create } from 'zustand';

interface JourneyMapState {
  selectedArtefactoId: string | null;
  // índice de la etapa activa en el chart (equivalente a state.stage del prototipo).
  activeStageIndex: number;
  lockedArtefactoId: string | null;

  select: (artefactoId: string) => void;
  setActiveStage: (index: number) => void;
  setLocked: (artefactoId: string | null) => void;
}

export const useJourneyMapStore = create<JourneyMapState>((set) => ({
  selectedArtefactoId: null,
  activeStageIndex: 0,
  lockedArtefactoId: null,

  select: (artefactoId) => set({ selectedArtefactoId: artefactoId, activeStageIndex: 0 }),
  setActiveStage: (index) => set({ activeStageIndex: index }),
  setLocked: (artefactoId) => set({ lockedArtefactoId: artefactoId }),
}));
