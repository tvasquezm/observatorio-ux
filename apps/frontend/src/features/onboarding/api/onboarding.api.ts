// apps/frontend/src/features/onboarding/api/onboarding.api.ts
//
// Fase 1 (PLAN_AJUSTES.md): acceso público de participante sin nombre/
// correo. Reemplaza el form Nombre/Correo por un único paso: entrar con
// el proyectoId (vía link/QR) y recibir el token de sesión directo.
//
// Ruta real expuesta por AuthController:
//   POST /api/auth/participants/access

import type { ParticipantAccessResponse } from '@observatorio-ux/shared-types';

export type { ParticipantAccessResponse };

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export class OnboardingApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'OnboardingApiError';
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const mensaje = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    return mensaje ?? `Error HTTP ${res.status}`;
  } catch {
    return `Error HTTP ${res.status}`;
  }
}

/**
 * Punto de acceso público: crea un Participante sin metadata personal y
 * devuelve el token de sesión (Bearer) para ese proyecto. No requiere
 * whitelist ni código de invitación — acceso abierto por link/QR.
 */
export async function accessProject(proyectoId: string): Promise<ParticipantAccessResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/participants/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyectoId }),
    });
  } catch {
    throw new OnboardingApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (!res.ok) {
    throw new OnboardingApiError(res.status, await parseErrorMessage(res));
  }

  return (await res.json()) as ParticipantAccessResponse;
}

export interface RegisterConsentResult {
  id: string;
  participanteId: string;
  proyectoId: string;
  aceptado: boolean;
  version: string;
}

// Versión del texto de consentimiento vigente. Al cambiar el texto real
// que se le muestra al participante, subir este valor para que quede
// registrado con qué versión aceptó.
export const VERSION_CONSENTIMIENTO = '1.0';

/**
 * Registra el consentimiento informado del participante. Sigue siendo
 * obligatorio tras la Fase 1 (requisito legal/ético) — solo cambió cómo
 * se identifica al participante, no si consiente. No manda
 * codigoInvitacion: un participante de acceso abierto nunca tuvo uno.
 */
export async function registerConsent(
  participanteId: string,
  proyectoId: string,
  aceptado: boolean,
): Promise<RegisterConsentResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/participants/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participanteId,
        proyectoId,
        aceptado,
        version: VERSION_CONSENTIMIENTO,
      }),
    });
  } catch {
    throw new OnboardingApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (!res.ok) {
    throw new OnboardingApiError(res.status, await parseErrorMessage(res));
  }

  return (await res.json()) as RegisterConsentResult;
}
