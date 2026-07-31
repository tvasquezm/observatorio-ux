// apps/frontend/src/lib/api-client.ts
//
// Cliente HTTP (fetch) con reconexión silenciosa ante 401 (ADR Master,
// sección 3). El participanteId en localStorage NUNCA se usa como
// credencial directa — solo como llave para solicitar una revalidación
// real contra la base de datos vía /participantes/reanudar.

import { notify } from './toast';

export class ApiValidationError extends Error {
  constructor(public detalles: { campo: string; mensaje: string }[]) {
    super('Error de validación del servidor');
  }
}

let renovandoToken: Promise<string> | null = null;

function getParticipanteLocal() {
  const participanteId = localStorage.getItem('participanteId');
  const proyectoId = localStorage.getItem('proyectoId');
  return participanteId && proyectoId ? { participanteId, proyectoId } : null;
}

// Evita reintentos concurrentes: si varias mutaciones fallan con 401 al
// mismo tiempo, solo se dispara UNA llamada a /reanudar; todas esperan
// la misma promesa en vez de pedir tokens en paralelo.
async function obtenerTokenFresco(): Promise<string> {
  if (renovandoToken) return renovandoToken;

  const local = getParticipanteLocal();
  if (!local) throw new Error('No hay sesión de participante que reanudar');

  renovandoToken = fetch('/api/participantes/reanudar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(local),
  })
    .then((res) => {
      if (!res.ok) throw new Error('No se pudo reanudar la sesión');
      return res.json();
    })
    .then((json) => {
      const { token } = json.data;
      localStorage.setItem('participanteToken', token);
      return token as string;
    })
    .finally(() => {
      renovandoToken = null;
    });

  return renovandoToken;
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  esReintento = false,
): Promise<T> {
  const token = localStorage.getItem('participanteToken');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Reconexión silenciosa — un solo reintento por request (esReintento
  // evita loop infinito si /reanudar también falla, ej. estudio cerrado).
  if (res.status === 401 && !esReintento) {
    try {
      await obtenerTokenFresco();
      return apiFetch<T>(url, options, true); // reintenta la operación ORIGINAL completa
    } catch {
      notify.error('Tu sesión expiró y no se pudo reanudar. El estudio puede estar cerrado.');
      throw new Error('No se pudo reanudar la sesión de participante');
    }
  }

  if (res.status === 400) {
    const body = await res.json();
    notify.error(body.error?.message ?? 'Error de validación');
    throw new ApiValidationError(body.error?.detalles ?? []);
  }
  if (!res.ok) {
    notify.error('Ocurrió un error inesperado');
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data as T; // desenvuelve el ResponseInterceptor { data, meta }
}
