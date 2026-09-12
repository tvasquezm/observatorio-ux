// apps/frontend/src/features/onboarding/store/useParticipantSession.ts
//
// Sesión de PARTICIPANTE (Bearer token) — distinta de useAuthStore
// (EVALUADOR, cookie httpOnly). Se guarda en localStorage bajo las
// mismas llaves que ya lee shared/api/api-client.ts (participanteToken,
// participanteId, proyectoId), para que ese cliente HTTP compartido
// pueda seguir usándose en el resto de la sesión del participante.

const TOKEN_KEY = 'participanteToken';
const PARTICIPANTE_ID_KEY = 'participanteId';
const PROYECTO_ID_KEY = 'proyectoId';

export interface ParticipantSession {
  token: string;
  participanteId: string;
  proyectoId: string;
}

export function guardarSesionParticipante(session: ParticipantSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(PARTICIPANTE_ID_KEY, session.participanteId);
  localStorage.setItem(PROYECTO_ID_KEY, session.proyectoId);
}

export function leerSesionParticipante(): ParticipantSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const participanteId = localStorage.getItem(PARTICIPANTE_ID_KEY);
  const proyectoId = localStorage.getItem(PROYECTO_ID_KEY);

  if (!token || !participanteId || !proyectoId) return null;
  return { token, participanteId, proyectoId };
}

export function limpiarSesionParticipante(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PARTICIPANTE_ID_KEY);
  localStorage.removeItem(PROYECTO_ID_KEY);
}
