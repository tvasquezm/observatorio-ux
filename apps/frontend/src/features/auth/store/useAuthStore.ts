// apps/frontend/src/features/auth/store/useAuthStore.ts
//
// OJO: la llave 'evaluadorToken' en localStorage ya la lee
// shared/api/artifacts.api.ts (getAuthToken, marcado como TODO ahí).
// Este store es la fuente real que faltaba — no cambiar el nombre de la
// llave sin actualizar ese archivo también.

import { create } from 'zustand';
import type { EvaluatorUser } from '../api/auth.api';

const TOKEN_KEY = 'evaluadorToken';
const USER_KEY = 'evaluadorUser';

interface AuthState {
  token: string | null;
  user: EvaluatorUser | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: EvaluatorUser) => void;
  logout: () => void;
}

function leerUserGuardado(): EvaluatorUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EvaluatorUser;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: leerUserGuardado(),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),

  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
