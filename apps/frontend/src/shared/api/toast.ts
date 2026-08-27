// apps/frontend/src/shared/api/toast.ts
//
// Notificador mínimo para que `api-client.ts` (y cualquier otro código que
// necesite avisar errores/éxitos al usuario) tenga algo real para importar.
// Implementación sin dependencias: solo loguea a consola por ahora.
//
// Cuando el equipo elija una librería de toasts real (react-hot-toast,
// sonner, shadcn/toast, etc.), reemplazar el cuerpo de estas funciones sin
// tocar los call sites — la forma de `notify` (con `.error`/`.success`/
// `.info`) está pensada para calzar con la API típica de esas librerías.

type NotifyFn = (message: string) => void;

function log(level: 'error' | 'success' | 'info', message: string): void {
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](`[toast:${level}] ${message}`);
}

export const notify: {
  error: NotifyFn;
  success: NotifyFn;
  info: NotifyFn;
} = {
  error: (message) => log('error', message),
  success: (message) => log('success', message),
  info: (message) => log('info', message),
};
