// apps/frontend/src/shared/api/confirm.ts
//
// Reemplazo de window.confirm() nativo (bloqueante, sin estilo, no
// testeable). Mismo patrón que ./toast.ts: CustomEvent en window + un
// componente montado una vez en la raíz (<ConfirmDialog />, ver
// shared/components/ui/ConfirmDialog.tsx) que escucha, dibuja el modal, y
// devuelve la respuesta disparando otro evento con el mismo id.
//
// Uso: const confirm = useConfirm(); if (await confirm('¿Seguro?')) { ... }

export interface ConfirmRequestDetail {
  id: number;
  message: string;
}

export interface ConfirmResponseDetail {
  id: number;
  result: boolean;
}

let contador = 0;

/**
 * Pide confirmación al usuario vía el modal global. Se resuelve `true` si
 * confirma, `false` si cancela (incluye cerrar con Escape o click afuera).
 */
export function askConfirm(message: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    // SSR / entorno de test sin window: no bloquear, asumir cancelado.
    console.warn('[confirm] sin window disponible, se asume cancelado:', message);
    return Promise.resolve(false);
  }

  const id = ++contador;

  return new Promise<boolean>((resolve) => {
    function onResponse(event: Event) {
      const detail = (event as CustomEvent<ConfirmResponseDetail>).detail;
      if (detail.id !== id) return; // no es la respuesta a este pedido
      window.removeEventListener('app:confirm-response', onResponse);
      resolve(detail.result);
    }

    window.addEventListener('app:confirm-response', onResponse);
    window.dispatchEvent(
      new CustomEvent<ConfirmRequestDetail>('app:confirm', { detail: { id, message } }),
    );
  });
}

/** Hook fino: mantiene la firma `useX()` pedida, sin estado propio. */
export function useConfirm(): (message: string) => Promise<boolean> {
  return askConfirm;
}
