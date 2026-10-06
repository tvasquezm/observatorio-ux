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

const ACCENT_CLASS: Record<ToastType, string> = {
  error: 'toast-item--error',
  success: 'toast-item--success',
  info: 'toast-item--info',
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
    <div aria-live="polite" className="toast-stack">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.type === 'error' ? 'alert' : 'status'}
          className={`toast-item ${ACCENT_CLASS[item.type]}`}
        >
          <span className="toast-message">{item.message}</span>
          <button onClick={() => quitar(item.id)} aria-label="Cerrar aviso" className="toast-close">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
