// apps/frontend/src/features/card-sorting/store/useCardSortingStore.ts
//
// Estado local, transitorio, de la sesión de participante en curso.
// Deliberadamente NO usa persist/localStorage: si el participante
// recarga la página a mitad del sorting, es preferible que vuelva a
// hacer join (flujo simple y consistente) antes que confiar en estado
// de cliente que puede desincronizarse de lo que el backend realmente
// tiene guardado. Si más adelante quieres sobrevivir un refresh, se
// puede agregar el middleware persist de zustand acá mismo sin tocar
// el resto de la feature.

import { create } from 'zustand';

interface CardSortingState {
  // Estudio (sesión maestra) al que el participante se unió.
  estudioId: string | null;
  // Sesión propia del participante (la que se usa para el submit).
  participantSessionId: string | null;

  setParticipantSession: (estudioId: string, sessionId: string) => void;
  clearParticipantSession: () => void;
}

export const useCardSortingStore = create<CardSortingState>((set) => ({
  estudioId: null,
  participantSessionId: null,

  setParticipantSession: (estudioId, sessionId) =>
    set({ estudioId, participantSessionId: sessionId }),

  clearParticipantSession: () =>
    set({ estudioId: null, participantSessionId: null }),
}));