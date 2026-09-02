// apps/frontend/src/shared/components/ToastContainer.tsx
//
// Escucha el evento 'app:toast' que emite shared/api/toast.ts y dibuja
// una pila de avisos en la esquina inferior. Un solo componente, montado
// una vez en la raíz de la app — ver instrucciones de montaje al final.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastEventDetail, ToastType } from '../api/toast';

interface ToastItem extends ToastEventDetail {
  id: number;
}

const DURACION_MS = 5000;

const ACCENTOS: Record<ToastType, string> = {
  error: '#B3431E',
  success: '#2F6846',
  info: '#3A5A78',
};

let contador = 0;

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeouts = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const quitar = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const t = timeouts.current.get(id);
    if (t) {
      clearTimeout(t);
      timeouts.current.delete(id);
    }
  }, []);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      const id = ++contador;
      setItems((prev) => [...prev, { ...detail, id }]);
      const t = setTimeout(() => quitar(id), DURACION_MS);
      timeouts.current.set(id, t);
    }

    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, [quitar]);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
        maxWidth: 340,
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.type === 'error' ? 'alert' : 'status'}
          style={{
            background: '#1C1C1C',
            color: '#F2F0EC',
            borderLeft: `3px solid ${ACCENTOS[item.type]}`,
            borderRadius: 4,
            padding: '10px 14px',
            fontSize: 14,
            lineHeight: 1.4,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            animation: 'toast-in 160ms ease-out',
          }}
        >
          <span style={{ flex: 1 }}>{item.message}</span>
          <button
            onClick={() => quitar(item.id)}
            aria-label="Cerrar aviso"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A6A29B',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: 2,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[role="alert"], div[role="status"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
