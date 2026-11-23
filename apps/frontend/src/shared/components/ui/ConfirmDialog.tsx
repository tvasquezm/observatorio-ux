// apps/frontend/src/shared/components/ui/ConfirmDialog.tsx
//
// Escucha el evento 'app:confirm' que emite shared/api/confirm.ts y dibuja
// un modal simple (Confirmar/Cancelar). Responde disparando
// 'app:confirm-response' con el mismo id. Un solo componente, montado una
// vez en la raíz de la app (ver main.tsx) — mismo criterio que
// ToastContainer.tsx.
//
// Con `requireText` agrega un campo: el botón Confirmar queda deshabilitado
// hasta escribir exactamente ese texto.

import { useEffect, useId, useRef, useState } from 'react';
import type { ConfirmRequestDetail, ConfirmResponseDetail } from '../../api/confirm';

function normalizar(valor: string) {
  return valor.normalize('NFC').trim();
}

export function ConfirmDialog() {
  const [pending, setPending] = useState<ConfirmRequestDetail | null>(null);
  const [texto, setTexto] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const messageId = useId();
  const fieldId = useId();

  useEffect(() => {
    function onConfirm(event: Event) {
      const detail = (event as CustomEvent<ConfirmRequestDetail>).detail;
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setTexto('');
      setPending(detail);
    }
    window.addEventListener('app:confirm', onConfirm);
    return () => window.removeEventListener('app:confirm', onConfirm);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!pending || !dialog) return;
    if (!dialog.open) dialog.showModal();
    if (pending.requireText) inputRef.current?.focus();
    else cancelRef.current?.focus();
  }, [pending]);

  const coincide = !pending?.requireText || normalizar(texto) === normalizar(pending.requireText);

  function responder(result: boolean) {
    if (!pending) return;
    window.dispatchEvent(
      new CustomEvent<ConfirmResponseDetail>('app:confirm-response', {
        detail: { id: pending.id, result },
      }),
    );
    dialogRef.current?.close();
    setPending(null);
    setTexto('');
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
        setTexto('');
        responder(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) responder(false);
      }}
    >
      <p id={messageId} className="confirm-message">{pending.message}</p>
      {pending.requireText && (
        <div className="confirm-field">
          <label htmlFor={fieldId}>Escribe «{pending.requireText}» para confirmar</label>
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={texto}
            autoComplete="off"
            aria-describedby={messageId}
            onChange={(event) => setTexto(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (coincide) responder(true);
            }}
          />
        </div>
      )}
      <div className="confirm-actions">
        <button
          ref={cancelRef}
          type="button"
          onClick={() => responder(false)}
          className="confirm-btn confirm-btn--cancel"
        >
          {pending.cancelLabel ?? 'Cancelar'}
        </button>
        <button
          type="button"
          onClick={() => responder(true)}
          className="confirm-btn confirm-btn--confirm"
          disabled={!coincide}
        >
          {pending.confirmLabel ?? 'Confirmar'}
        </button>
      </div>
    </dialog>
  );
}
