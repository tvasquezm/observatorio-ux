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
  isEvaluatorRole,
  readStoredPerspective,
  storePerspective,
} from '../../../shared/auth/perspectivas';

const USER_KEY = 'evaluadorUser';
let sessionCheckPromise: Promise<void> | null = null;

interface AuthState {
  user: EvaluatorUser | null;
  /** Vista elegida en la interfaz. Nunca reemplaza el rol real de la cuenta. */
  perspectiveRole: EvaluatorRole | null;
  isAuthenticated: boolean;
  /** true mientras checkSession() no resolvió al menos una vez. */
  isChecking: boolean;
  expiresAt: number | null;
  sessionEnding: boolean;
  sessionNotice: boolean;
  setExpiresAt: (value: number) => void;
  expireSession: () => void;
  setSession: (user: EvaluatorUser, expiresAt?: number) => void;
  setPerspective: (role: EvaluatorRole) => void;
  logout: () => void;
  /** Valida la sesión real contra /auth/me y reutiliza la misma promesa
   *  cuando React StrictMode monta el árbol dos veces en desarrollo. */
  checkSession: () => Promise<void>;
}

function leerUserGuardado(): EvaluatorUser | null {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return null;
  }
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EvaluatorUser>;
    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.nombre !== 'string' ||
      typeof parsed.email !== 'string' ||
      !isEvaluatorRole(parsed.rol)
    ) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return parsed as EvaluatorUser;
  } catch {
    return null;
  }
}

const cachedUser = leerUserGuardado();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: cachedUser,
  perspectiveRole: cachedUser ? readStoredPerspective(cachedUser, sessionStorage) : null,
  // Optimista: si hay caché, se asume autenticado hasta que checkSession
  // diga lo contrario — evita un flash a /login en cada recarga mientras
  // se confirma con el backend.
  isAuthenticated: !!cachedUser,
  isChecking: true,
  expiresAt: null,
  sessionEnding: false,
  sessionNotice: false,
  setExpiresAt: expiresAt => set({ expiresAt }),
  expireSession: () => {
    localStorage.removeItem(USER_KEY);
    clearStoredPerspective(sessionStorage);
    set({ user: null, perspectiveRole: null, isAuthenticated: false, isChecking: false, expiresAt: null, sessionEnding: true, sessionNotice: false });
  },

  setSession: (user, expiresAt) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    storePerspective(user, user.rol, sessionStorage);
    set({ user, perspectiveRole: user.rol, isAuthenticated: true, isChecking: false, expiresAt: expiresAt ?? null, sessionEnding: false, sessionNotice: false });
  },

  setPerspective: (role) => {
    set((state) => {
      if (!state.user || !canUsePerspective(state.user.rol, role)) return state;
      storePerspective(state.user, role, sessionStorage);
      return { perspectiveRole: role };
    });
  },

  logout: () => {
    window.dispatchEvent(new Event('observatorio-ux-manual-logout'));
    const userId = get().user?.id;
    for (const key of Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)) {
      if (!key.startsWith('observatorio-ux-draft:')) continue;
      try { if (JSON.parse(localStorage.getItem(key)!).userId === userId) localStorage.removeItem(key); } catch { localStorage.removeItem(key); }
    }
    sessionStorage.removeItem('observatorio-ux-returnTo');
    localStorage.removeItem(USER_KEY);
    clearStoredPerspective(sessionStorage);
    set({ user: null, perspectiveRole: null, isAuthenticated: false, isChecking: false, expiresAt: null, sessionEnding: true, sessionNotice: false });
    // Best-effort: limpia las cookies httpOnly en el backend. No se espera
    // la respuesta — el estado local ya cambió y ProtectedRoute ya va a
    // redirigir a /login; si esta llamada falla (ej. red caída), las
    // cookies igual van a expirar solas por el TTL del JWT.
    logoutApi().catch(() => {});
  },

  checkSession: () => {
    if (!get().isChecking) return Promise.resolve();
    if (sessionCheckPromise) return sessionCheckPromise;

    sessionCheckPromise = (async () => {
      try {
        const { user, session } = await fetchMe();
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        set({
          user,
          perspectiveRole: readStoredPerspective(user, sessionStorage),
          isAuthenticated: true,
          isChecking: false,
          expiresAt: session?.expiresAt ?? null,
          sessionEnding: false,
        });
      } catch {
        // 401 (cookie ausente/expirada/inválida) o error de red: no hay
        // sesión real que sostener, sin importar lo que dijera la caché.
        localStorage.removeItem(USER_KEY);
        clearStoredPerspective(sessionStorage);
        set({ user: null, perspectiveRole: null, isAuthenticated: false, isChecking: false });
      } finally {
        sessionCheckPromise = null;
      }
    })();

    return sessionCheckPromise;
  },
}));
