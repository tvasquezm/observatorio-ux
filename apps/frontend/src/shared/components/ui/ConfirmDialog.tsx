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
    <div
      role="presentation"
      onClick={() => responder(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={pending.message}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1C1C1C',
          color: '#F2F0EC',
          borderRadius: 6,
          padding: 20,
          maxWidth: 360,
          width: '90%',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          animation: 'confirm-in 140ms ease-out',
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.5 }}>{pending.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={() => responder(false)}
            style={{
              background: 'transparent',
              border: '1px solid #4A4A4A',
              color: '#F2F0EC',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => responder(true)}
            autoFocus
            style={{
              background: '#B3431E',
              border: 'none',
              color: '#fff',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
      <style>{`
        @keyframes confirm-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[role="alertdialog"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
