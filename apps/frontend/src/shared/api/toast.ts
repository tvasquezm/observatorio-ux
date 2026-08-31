// apps/frontend/src/shared/api/toast.ts
//
// Wrapper mínimo, cero dependencias de pago. api-client.ts ya importa
// `notify` desde este mismo directorio (`./toast`), así que este archivo
// vive acá y no en shared/ui/ — mantiene el import existente sin tocarlo.
//
// Implementación in-memory + CustomEvent: cualquier componente de UI
// (un <ToastContainer /> en el layout raíz) puede escuchar el evento
// 'app:toast' en window y renderizar. Si el proyecto ya tiene una librería
// de toasts (ej. algo que se vea en features/card-sorting o en package.json),
// reemplazar el cuerpo de estas 3 funciones por esa llamada — la firma
// pública (notify.error/success/info) no tiene que cambiar.

export type ToastType = 'error' | 'success' | 'info';

export interface ToastEventDetail {
  type: ToastType;
  message: string;
}

function emit(type: ToastType, message: string) {
  if (typeof window === 'undefined') {
    // SSR / entorno de test sin window: no romper, solo loguear.
    console.warn(`[toast:${type}]`, message);
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>('app:toast', { detail: { type, message } }),
  );
}

export const notify = {
  error: (message: string) => emit('error', message),
  success: (message: string) => emit('success', message),
  info: (message: string) => emit('info', message),
};
