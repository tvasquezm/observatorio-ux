// apps/frontend/src/lib/api-client.ts
//
// Cliente HTTP (fetch) para el PARTICIPANTE. Ya no intenta reconexión
// automática vía /participantes/reanudar — ese endpoint no existe en el
// backend. Ante un 401 (token vencido), se corta con un mensaje claro
// para que el participante vuelva a entrar por el link original; el
// progreso ya clasificado NO se pierde porque se cachea aparte (ver
// features/onboarding/pages/ParticipantCardSortingPage.tsx).

import { notify } from './toast';

// Estructura acordada tras la decisión del dueño (Sprint 3): se necesita
// marcar el input exacto que falló en los formularios. El backend ahora
// emite `message` como { campo, mensaje }[] en los 400 de validación
// (ver exceptionFactory en main.ts). `campo: ''` cubre el caso borde de
// un 400 manual (ej. `throw new BadRequestException('mensaje suelto')`)
// que no pasó por ValidationPipe y no trae campo aislado.
export interface DetalleValidacion {
  campo: string;
  mensaje: string;
}

export class ApiValidationError extends Error {
  constructor(public detalles: DetalleValidacion[]) {
    super('Error de validación del servidor');
  }
}

// Se lanza específicamente en 401, para que quien llame pueda
// distinguir "sesión vencida" de cualquier otro error y decidir qué
// hacer (ej. mostrar "volvé a entrar por el link").
export class SesionExpiradaError extends Error {
  constructor() {
    super('Tu sesión expiró. Vuelve a entrar usando el link original para continuar.');
    this.name = 'SesionExpiradaError';
  }
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function normalizarDetalles(message: unknown): DetalleValidacion[] {
  if (Array.isArray(message) && message.every((m) => m && typeof m === 'object' && 'campo' in m)) {
    return message as DetalleValidacion[];
  }
  if (Array.isArray(message)) {
    return message.map((m) => ({ campo: '', mensaje: String(m) }));
  }
  return [{ campo: '', mensaje: String(message ?? 'Error de validación') }];
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('participanteToken');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    throw new SesionExpiradaError();
  }

  if (res.status === 400) {
    const body = await res.json();
    const detalles = normalizarDetalles(body.message);
    notify.error(detalles.map((d) => d.mensaje).join(' '));
    throw new ApiValidationError(detalles);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const mensaje = res.status === 429
      ? 'Hay muchas personas intentando entrar al mismo tiempo. Espera unos segundos y vuelve a intentarlo.'
      : Array.isArray(body?.message)
        ? body.message.join(' ')
        : body?.message;
    notify.error(mensaje ?? 'Ocurrió un error inesperado');
    throw new ApiRequestError(res.status, mensaje ?? `Error ${res.status}: ${res.statusText}`);
  }

  // Confirmado por prueba real (POST /projects/:id/artifacts): el backend
  // NO envuelve la respuesta exitosa en { data, meta } — devuelve el
  // objeto directo. Se quita el desenvoltorio que asumía ese wrapper.
  return (await res.json()) as T;
}

