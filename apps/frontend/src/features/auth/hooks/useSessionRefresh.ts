import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { evaluatorRequest } from '../../../shared/api/evaluator-client';
import { handleSessionExpired } from '../../../shared/auth/session-expired';
import { useAuthStore } from '../store/useAuthStore';

interface Renewal { renewed: boolean; session: { expiresAt: number; refreshAt?: number } }
export function useSessionRefresh() {
  const expiresAt = useAuthStore(s => s.expiresAt);
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const location = useLocation();
  const path = useRef(location.pathname + location.search);
  const previousPath = useRef(path.current);
  path.current = location.pathname + location.search;
  const lastActivity = useRef(0);
  const lastRenewal = useRef(Date.now() - 1);
  const attempted = useRef(false);
  const pending = useRef(false);
  const retryAfter = useRef(0);
  const [notice, setNotice] = useState(false);
  const [limited, setLimited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scheduled, setScheduled] = useState<{ at: number; manual: boolean } | null>(null);
  const refresh = useCallback(async (manual = false) => {
    const state = useAuthStore.getState();
    if (!state.isAuthenticated || !state.expiresAt || pending.current || Date.now() < retryAfter.current) return;
    if (!manual && (attempted.current || state.expiresAt - Date.now() > 600_000 || lastActivity.current <= lastRenewal.current)) return;
    attempted.current = true;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await evaluatorRequest<Renewal>('/auth/refresh', { method: 'POST' });
      if (!useAuthStore.getState().isAuthenticated) return;
      if (!result.renewed && result.session.refreshAt && result.session.refreshAt > Date.now()) {
        setScheduled({ at: result.session.refreshAt, manual });
        return;
      }
      lastRenewal.current = Date.now();
      setScheduled(null);
      const capped = result.renewed && result.session.expiresAt <= state.expiresAt;
      setLimited(capped);
      useAuthStore.getState().setExpiresAt(result.session.expiresAt);
      if (result.session.expiresAt - Date.now() > 120_000) setNotice(false);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) handleSessionExpired(path.current);
      else {
        retryAfter.current = Date.now() + 60_000;
        attempted.current = false;
        setError(status === 429 ? 'Espera un minuto antes de volver a intentarlo.' : 'No se pudo renovar la sesión. Vuelve a intentarlo.');
      }
    } finally { pending.current = false; setBusy(false); }
  }, []);
  useEffect(() => {
    if (!scheduled || !authenticated) return;
    const timer = setTimeout(() => { attempted.current = false; void refresh(scheduled.manual); }, Math.max(0, scheduled.at - Date.now()));
    return () => clearTimeout(timer);
  }, [scheduled, authenticated, refresh]);
  const activity = useCallback(() => {
    if (Date.now() - lastActivity.current < 30_000) return;
    lastActivity.current = Date.now();
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!authenticated || !expiresAt) return;
    attempted.current = false;
    const schedule = (time: number, action: () => void) => window.setTimeout(action, Math.max(0, time - Date.now()));
    const timers = [schedule(expiresAt - 600_000, () => void refresh()), schedule(expiresAt - 120_000, () => setNotice(true)), schedule(expiresAt, () => handleSessionExpired(path.current))];
    window.addEventListener('pointerdown', activity);
    window.addEventListener('keydown', activity);
    return () => { timers.forEach(clearTimeout); window.removeEventListener('pointerdown', activity); window.removeEventListener('keydown', activity); };
  }, [authenticated, expiresAt, refresh, activity]);
  useEffect(() => {
    if (previousPath.current !== path.current) { previousPath.current = path.current; activity(); }
  }, [location.pathname, location.search, activity]);
  useEffect(() => {
    useAuthStore.setState({ sessionNotice: notice });
    return () => { useAuthStore.setState({ sessionNotice: false }); };
  }, [notice]);
  return { notice, limited, busy, error, expiresAt, dismiss: () => setNotice(false), refresh: () => refresh(true) };
}
