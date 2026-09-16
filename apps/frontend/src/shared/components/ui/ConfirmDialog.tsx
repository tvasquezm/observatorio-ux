// apps/frontend/src/shared/components/ui/ConfirmDialog.tsx
//
// Escucha el evento 'app:confirm' que emite shared/api/confirm.ts y dibuja
// un modal simple (Confirmar/Cancelar). Responde disparando
// 'app:confirm-response' con el mismo id. Un solo componente, montado una
// vez en la raíz de la app (ver main.tsx) — mismo criterio que
// ToastContainer.tsx.

import { useEffect, useId, useRef, useState } from 'react';
import type { ConfirmRequestDetail, ConfirmResponseDetail } from '../../api/confirm';

export function ConfirmDialog() {
  const [pending, setPending] = useState<ConfirmRequestDetail | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const messageId = useId();

  useEffect(() => {
    function onConfirm(event: Event) {
      const detail = (event as CustomEvent<ConfirmRequestDetail>).detail;
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setPending(detail);
    }
    window.addEventListener('app:confirm', onConfirm);
    return () => window.removeEventListener('app:confirm', onConfirm);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!pending || !dialog) return;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
  }, [pending]);

  function responder(result: boolean) {
    if (!pending) return;
    window.dispatchEvent(
      new CustomEvent<ConfirmResponseDetail>('app:confirm-response', {
        detail: { id: pending.id, result },
      }),
    );
    dialogRef.current?.close();
    setPending(null);
    window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }

  if (!pending) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={messageId}
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        responder(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) responder(false);
      }}
    >
      <p id={messageId} className="confirm-message">{pending.message}</p>
      <div className="confirm-actions">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => responder(false)}
          className="confirm-btn confirm-btn--cancel"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => responder(true)}
          className="confirm-btn confirm-btn--confirm"
        >
          Confirmar
        </button>
      </div>
    </dialog>
  );
}
