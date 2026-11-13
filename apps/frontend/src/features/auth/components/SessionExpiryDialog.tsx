import { useEffect, useRef, useState } from 'react';
import { useSessionRefresh } from '../hooks/useSessionRefresh';
import { useAuthStore } from '../store/useAuthStore';

export function SessionExpiryDialog() {
  const { notice, limited, busy, error, expiresAt, dismiss, refresh } = useSessionRefresh();
  const ref = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!notice) { ref.current?.close(); return; }
    const focus = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); ref.current?.close(); focus?.focus(); };
  }, [notice]);
  return <>{!notice && expiresAt && expiresAt - Date.now() <= 120_000 && <p role="status">Tu sesión termina a las {new Date(expiresAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}. Guarda tu trabajo.</p>}<dialog ref={ref} className="report-dialog" role="alertdialog" aria-labelledby="session-expiry-title" aria-describedby="session-expiry-description" onCancel={e => { e.preventDefault(); dismiss(); }}>
    <h2 id="session-expiry-title">Tu sesión está por terminar</h2>
    <p id="session-expiry-description">{limited ? `Por seguridad, la sesión termina a las ${new Date(expiresAt ?? now).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}. Guarda tu trabajo.` : `Quedan ${Math.max(0, Math.ceil(((expiresAt ?? now) - now) / 1000))} segundos. Guarda tu trabajo o sigue conectado.`}</p>
    {error && <p role="alert">{error}</p>}
    <div className="session-actions"><button type="button" className="primary" disabled={busy} onClick={() => void refresh()}>{busy ? 'Renovando…' : 'Seguir conectado'}</button><button type="button" className="secondary" onClick={dismiss}>Volver a mi trabajo</button><button type="button" className="secondary" onClick={() => useAuthStore.getState().logout()}>Cerrar sesión</button></div>
  </dialog></>;
}
