// apps/frontend/src/features/onboarding/store/useParticipantSession.ts
//
// Sesión de PARTICIPANTE (Bearer token) — distinta de useAuthStore.
// Se limita a sessionStorage: sobrevive una recarga de la actividad, pero
// desaparece al cerrar la pestaña y no queda como credencial persistente.

const TOKEN_KEY = 'participanteToken';
const RESUME_TOKEN_KEY = 'participanteResumeToken';
const PARTICIPANTE_ID_KEY = 'participanteId';
const PROYECTO_ID_KEY = 'proyectoId';

// Eliminar credenciales persistentes de instalaciones anteriores al cambio
// a sessionStorage; nunca migrar un token antiguo a una sesión nueva.
function limpiarCredencialesPersistentes(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(RESUME_TOKEN_KEY);
  } catch {
    // El navegador puede deshabilitar el almacenamiento persistente.
  }
}

export interface ParticipantSession {
  token: string;
  resumeToken?: string;
  participanteId: string;
  proyectoId: string;
}

export function guardarSesionParticipante(session: ParticipantSession): void {
  limpiarCredencialesPersistentes();
  sessionStorage.setItem(TOKEN_KEY, session.token);
  if (session.resumeToken) {
    sessionStorage.setItem(RESUME_TOKEN_KEY, session.resumeToken);
  } else {
    sessionStorage.removeItem(RESUME_TOKEN_KEY);
  }
  sessionStorage.setItem(PARTICIPANTE_ID_KEY, session.participanteId);
  sessionStorage.setItem(PROYECTO_ID_KEY, session.proyectoId);
}

export function leerSesionParticipante(): ParticipantSession | null {
  limpiarCredencialesPersistentes();
  const token = sessionStorage.getItem(TOKEN_KEY);
  const resumeToken = sessionStorage.getItem(RESUME_TOKEN_KEY) ?? undefined;
  const participanteId = sessionStorage.getItem(PARTICIPANTE_ID_KEY);
  const proyectoId = sessionStorage.getItem(PROYECTO_ID_KEY);

  if (!token || !participanteId || !proyectoId) return null;
  return { token, resumeToken, participanteId, proyectoId };
}

export function limpiarSesionParticipante(): void {
  limpiarCredencialesPersistentes();
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(RESUME_TOKEN_KEY);
  sessionStorage.removeItem(PARTICIPANTE_ID_KEY);
  sessionStorage.removeItem(PROYECTO_ID_KEY);
}
