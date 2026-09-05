// apps/frontend/src/shared/components/ui/ConfirmDialog.tsx
//
// Escucha el evento 'app:confirm' que emite shared/api/confirm.ts y dibuja
// un modal simple (Confirmar/Cancelar). Responde disparando
// 'app:confirm-response' con el mismo id. Un solo componente, montado una
// vez en la raíz de la app (ver main.tsx) — mismo criterio que
// ToastContainer.tsx.

import { useEffect, useState } from 'react';
import type { ConfirmRequestDetail, ConfirmResponseDetail } from '../../api/confirm';

export function ConfirmDialog() {
  const [pending, setPending] = useState<ConfirmRequestDetail | null>(null);

  useEffect(() => {
    function onConfirm(event: Event) {
      const detail = (event as CustomEvent<ConfirmRequestDetail>).detail;
      setPending(detail);
    }
    window.addEventListener('app:confirm', onConfirm);
    return () => window.removeEventListener('app:confirm', onConfirm);
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') responder(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function responder(result: boolean) {
    if (!pending) return;
    window.dispatchEvent(
      new CustomEvent<ConfirmResponseDetail>('app:confirm-response', {
        detail: { id: pending.id, result },
      }),
    );
    setPending(null);
  }

  if (!pending) return null;

  return (
    <div role="presentation" onClick={() => responder(false)} className="confirm-overlay">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={pending.message}
        onClick={(e) => e.stopPropagation()}
        className="confirm-dialog"
      >
        <p className="confirm-message">{pending.message}</p>
        <div className="confirm-actions">
          <button
            type="button"
            onClick={() => responder(false)}
            className="confirm-btn confirm-btn--cancel"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => responder(true)}
            autoFocus
            className="confirm-btn confirm-btn--confirm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
