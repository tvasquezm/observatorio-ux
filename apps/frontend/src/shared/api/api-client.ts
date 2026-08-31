// apps/frontend/src/lib/api-client.ts
//
// Cliente HTTP (fetch) con reconexión silenciosa ante 401 (ADR Master,
// sección 3). El participanteId en localStorage NUNCA se usa como
// credencial directa — solo como llave para solicitar una revalidación
// real contra la base de datos vía /participantes/reanudar.

import { notify } from './toast';

// OJO / CAMBIO DE CONTRATO: antes esta clase esperaba `detalles` como
// { campo, mensaje }[] (errores por campo). El filtro global nuevo del
// backend (formato plano acordado) no distingue campo — ValidationPipe
// entrega `message` como string[] genérico ("nombreCompleto must be a
// string", etc.), sin el nombre del campo aislado. Si algún formulario
// consumía `.detalles[i].campo` para resaltar un input específico, ese
// uso se rompe acá y hay que revisarlo aparte.
export class ApiValidationError extends Error {
  constructor(public detalles: string[]) {
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
    const mensajes = Array.isArray(body.message) ? body.message : [body.message ?? 'Error de validación'];
    notify.error(mensajes.join(' '));
    throw new ApiValidationError(mensajes);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    notify.error(mensaje ?? 'Ocurrió un error inesperado');
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  // Confirmado por prueba real (POST /projects/:id/artifacts): el backend
  // NO envuelve la respuesta exitosa en { data, meta } — devuelve el
  // objeto directo. Se quita el desenvoltorio que asumía ese wrapper.
  return (await res.json()) as T;
}
