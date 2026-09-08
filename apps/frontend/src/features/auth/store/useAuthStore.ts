// apps/frontend/src/features/auth/store/useAuthStore.ts
//
// Alineado a Fase 3 (auth por cookie httpOnly `evaluadorToken`, ver
// jwt.strategy.ts): el token YA NO vive en localStorage ni en este store
// — es httpOnly, ni siquiera JS puede leerlo. La fuente de verdad real de
// `isAuthenticated` es GET /auth/me (ver checkSession), no localStorage.
//
// El `user` sí se cachea en localStorage, pero solo como valor optimista
// para pintar la UI de inmediato en cada recarga mientras checkSession()
// resuelve — nunca reemplaza esa validación contra el backend. Si la
// cookie expiró o fue revocada del lado del servidor, checkSession() lo
// corrige y desloguea, aunque la caché dijera lo contrario.

import { create } from 'zustand';
import type { EvaluatorRole, EvaluatorUser } from '../api/auth.api';
import { me as fetchMe, logout as logoutApi } from '../api/auth.api';
import {
  canUsePerspective,
  clearStoredPerspective,
  readStoredPerspective,
  storePerspective,
} from '../../../shared/auth/perspectivas';

const USER_KEY = 'evaluadorUser';

interface AuthState {
  user: EvaluatorUser | null;
  /** Vista elegida en la interfaz. Nunca reemplaza el rol real de la cuenta. */
  perspectiveRole: EvaluatorRole | null;
  isAuthenticated: boolean;
  /** true mientras checkSession() no resolvió al menos una vez. */
  isChecking: boolean;
  setSession: (user: EvaluatorUser) => void;
  setPerspective: (role: EvaluatorRole) => void;
  logout: () => void;
  /** Valida la sesión real contra /auth/me. Idempotente, sin dedupe de
   *  llamadas concurrentes — ProtectedRoute la dispara una sola vez por
   *  montaje, no hace falta más para este alcance. */
  checkSession: () => Promise<void>;
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

const cachedUser = leerUserGuardado();

export const useAuthStore = create<AuthState>((set) => ({
  user: cachedUser,
  perspectiveRole: cachedUser ? readStoredPerspective(cachedUser, sessionStorage) : null,
  // Optimista: si hay caché, se asume autenticado hasta que checkSession
  // diga lo contrario — evita un flash a /login en cada recarga mientras
  // se confirma con el backend.
  isAuthenticated: !!cachedUser,
  isChecking: true,

  setSession: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    storePerspective(user, user.rol, sessionStorage);
    set({ user, perspectiveRole: user.rol, isAuthenticated: true, isChecking: false });
  },

  setPerspective: (role) => {
    set((state) => {
      if (!state.user || !canUsePerspective(state.user.rol, role)) return state;
      storePerspective(state.user, role, sessionStorage);
      return { perspectiveRole: role };
    });
  },

  logout: () => {
    localStorage.removeItem(USER_KEY);
    clearStoredPerspective(sessionStorage);
    set({ user: null, perspectiveRole: null, isAuthenticated: false, isChecking: false });
    // Best-effort: limpia las cookies httpOnly en el backend. No se espera
    // la respuesta — el estado local ya cambió y ProtectedRoute ya va a
    // redirigir a /login; si esta llamada falla (ej. red caída), las
    // cookies igual van a expirar solas por el TTL del JWT.
    logoutApi().catch(() => {});
  },

  checkSession: async () => {
    try {
      const { user } = await fetchMe();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({
        user,
        perspectiveRole: readStoredPerspective(user, sessionStorage),
        isAuthenticated: true,
        isChecking: false,
      });
    } catch {
      // 401 (cookie ausente/expirada/inválida) o error de red: no hay
      // sesión real que sostener, sin importar lo que dijera la caché.
      localStorage.removeItem(USER_KEY);
      clearStoredPerspective(sessionStorage);
      set({ user: null, perspectiveRole: null, isAuthenticated: false, isChecking: false });
    }
  },
}));
