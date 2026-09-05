// apps/frontend/src/features/auth/store/useAuthStore.ts
//
// Alineado a Fase 3 (auth por cookie httpOnly `evaluadorToken`, ver
// jwt.strategy.ts): el token YA NO vive en localStorage ni en este store
// — es httpOnly, ni siquiera JS puede leerlo, y no hace falta: el
// navegador lo reenvía solo en cada fetch con `credentials: 'include'`
// (ver shared/api/artifacts.api.ts, features/projects/api/projects.api.ts,
// features/evaluacion-heuristica/api/evaluacion-heuristica.api.ts).
//
// Lo único que este store cachea en localStorage es el `user` (no es
// secreto, es solo para no mostrar la UI vacía medio segundo en cada
// recarga) — la fuente de verdad real de la sesión es la cookie del
// backend, no esta caché.

import { create } from 'zustand';
import type { EvaluatorUser } from '../api/auth.api';
import { logout as logoutApi } from '../api/auth.api';

const USER_KEY = 'evaluadorUser';

interface AuthState {
  user: EvaluatorUser | null;
  isAuthenticated: boolean;
  setSession: (user: EvaluatorUser) => void;
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
  user: leerUserGuardado(),
  isAuthenticated: !!leerUserGuardado(),

  setSession: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(USER_KEY);
    set({ user: null, isAuthenticated: false });
    // Best-effort: limpia las cookies httpOnly en el backend. No se espera
    // la respuesta — el estado local ya cambió y ProtectedRoute ya va a
    // redirigir a /login; si esta llamada falla (ej. red caída), las
    // cookies igual van a expirar solas por el TTL del JWT.
    logoutApi().catch(() => {});
  },
}));
