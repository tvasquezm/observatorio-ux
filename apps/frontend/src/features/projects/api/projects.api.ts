// apps/frontend/src/features/projects/api/projects.api.ts

import { useAuthStore } from '../../auth/store/useAuthStore';
import { notify } from '../../../shared/api/toast';
import { csrfHeaders } from '../../../shared/api/csrf';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoPorId: string;
  createdAt: string;
  salaId?: string | null;
  _count?: {
    sesiones: number;
    artefactos: number;
  };
}

export class ProjectsApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ProjectsApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      // Cookie de sesión httpOnly (Fase 3) — sin esto el navegador no
      // manda `evaluadorToken` en un fetch cross-origin (5173 → 3000 en
      // dev), y el backend rechaza todo con 401.
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Double-submit CSRF: solo se agrega para métodos mutantes (ver
        // shared/api/csrf.ts) — csrfProtection en main.ts los exige.
        ...csrfHeaders(init.method),
        ...init.headers,
      },
    });
  } catch {
    throw new ProjectsApiError(0, 'No se pudo conectar con el servidor.');
  }
  if (res.status === 401) {
    // Mismo criterio que shared/api/artifacts.api.ts (Fase 1): se
    // cierra sesión acá y ProtectedRoute redirige solo a /login al
    // reaccionar al cambio de isAuthenticated.
    useAuthStore.getState().logout();
    notify.error('Tu sesión expiró. Vuelve a iniciar sesión.');
    throw new ProjectsApiError(401, 'Sesión expirada.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message)
      ? body.message.map((m: any) => m.mensaje ?? m).join(' ')
      : (body?.message ?? `Error HTTP ${res.status}`);
    throw new ProjectsApiError(res.status, mensaje);
  }
  return (await res.json()) as T;
}

export function listProjects(): Promise<Proyecto[]> {
  return request<Proyecto[]>('/projects');
}

export function getProject(id: string): Promise<Proyecto> {
  return request<Proyecto>(`/projects/${id}`);
}

export function createProject(nombre: string, descripcion?: string): Promise<Proyecto> {
  return request<Proyecto>('/projects', {
    method: 'POST',
    body: JSON.stringify({ nombre, descripcion }),
  });
}

export function updateProject(
  id: string,
  data: { nombre?: string; descripcion?: string },
): Promise<Proyecto> {
  return request<Proyecto>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export interface MiembroProyecto {
  id: string;
  proyectoId: string;
  usuarioId: string;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
}

export function listMembers(proyectoId: string): Promise<MiembroProyecto[]> {
  return request<MiembroProyecto[]>(`/projects/${proyectoId}/miembros`);
}

export function addMember(proyectoId: string, email: string): Promise<MiembroProyecto> {
  return request<MiembroProyecto>(`/projects/${proyectoId}/miembros`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeMember(proyectoId: string, usuarioId: string): Promise<{ eliminado: boolean }> {
  return request<{ eliminado: boolean }>(`/projects/${proyectoId}/miembros/${usuarioId}`, {
    method: 'DELETE',
  });
}

// --- Whitelist de participantes (sujetos de estudio, distinto de miembros) ---
//
// Sin una entrada acá, AuthService.registerParticipant (backend) rechaza el
// autorregistro del participante con 403 — este es el paso previo obligatorio
// para que alguien pueda unirse a cualquier sesión (card sorting, evaluación
// heurística, etc). Ruta real: WhitelistEntryDto { email, nombre? } — el
// backend acepta bulk (mínimo 1), por eso el request toma un array.

export interface WhitelistEntry {
  id: string;
  email: string;
  nombre: string | null;
  usado: boolean;
  createdAt: string;
}

export interface WhitelistEntradaInput {
  email: string;
  nombre?: string;
}

export interface InvitationCredential {
  email: string;
  codigoInvitacion: string;
}

export interface AddToWhitelistResult {
  agregados: number;
  enviados: number;
  invitaciones: InvitationCredential[];
}

export function listWhitelist(proyectoId: string): Promise<WhitelistEntry[]> {
  return request<WhitelistEntry[]>(`/projects/${proyectoId}/participantes`);
}

export function addToWhitelist(
  proyectoId: string,
  participantes: WhitelistEntradaInput[],
): Promise<AddToWhitelistResult> {
  return request<AddToWhitelistResult>(
    `/projects/${proyectoId}/participantes`,
    {
      method: 'POST',
      body: JSON.stringify({ participantes }),
    },
  );
}
