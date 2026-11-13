import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../features/auth/store/useAuthStore';

function compatible(template: unknown, value: unknown): boolean {
  if (template === null) return value === null || typeof value === 'string' || typeof value === 'boolean';
  if (Array.isArray(template)) return Array.isArray(value) && value.every(v => template.length ? compatible(template[0], v) : typeof v === 'string');
  if (typeof template === 'object') return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(template).every(([k, v]) => compatible(v, (value as Record<string, unknown>)[k]));
  return typeof template === typeof value;
}

export function useFormDraft<T>(key: string, value: T, restore: (value: T) => void, options: { dirty: boolean; enabled: boolean; onDiscard: () => void }) {
  const userId = useAuthStore(s => s.user?.id);
  const storageKey = `observatorio-ux-draft:${userId}:${key}`;
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef({ value, restore, options, userId, storageKey });
  latest.current = { value, restore, options, userId, storageKey };
  const suppressed = useRef<string | null>(null);
  const manualLogout = useRef(false);
  const snapshot = JSON.stringify(value);
  function persist() {
    const current = latest.current;
    if (!current.userId || manualLogout.current || !current.options.enabled || !current.options.dirty || suppressed.current === JSON.stringify(current.value)) return;
    try { localStorage.setItem(current.storageKey, JSON.stringify({ userId: current.userId, value: current.value })); setError(''); }
    catch { setError('No pudimos guardar el borrador en este navegador. Guarda tus cambios antes de salir.'); }
  }
  useEffect(() => {
    manualLogout.current = false;
    suppressed.current = null;
    setRestored(false);
    if (!userId) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.userId !== userId || !compatible(latest.current.value, saved.value)) { localStorage.removeItem(storageKey); return; }
      latest.current.restore(saved.value);
      setRestored(true);
    } catch { localStorage.removeItem(storageKey); }
  }, [storageKey, userId]);
  useEffect(() => {
    if (!options.enabled || !options.dirty) return;
    const timer = setTimeout(persist, 800);
    return () => clearTimeout(timer);
  }, [snapshot, storageKey, options.enabled, options.dirty]);
  useEffect(() => {
    const logout = () => { manualLogout.current = true; };
    const discard = () => { if (latest.current.options.enabled) clear(); };
    window.addEventListener('observatorio-ux-flush-drafts', persist);
    window.addEventListener('pagehide', persist);
    window.addEventListener('observatorio-ux-manual-logout', logout);
    window.addEventListener('observatorio-ux-discard-route-drafts', discard);
    return () => {
      persist();
      window.removeEventListener('observatorio-ux-flush-drafts', persist);
      window.removeEventListener('pagehide', persist);
      window.removeEventListener('observatorio-ux-manual-logout', logout);
      window.removeEventListener('observatorio-ux-discard-route-drafts', discard);
    };
  }, []);
  function clear() {
    suppressed.current = JSON.stringify(latest.current.value);
    localStorage.removeItem(latest.current.storageKey);
    setRestored(false); setError('');
  }
  return { restored, error, clear, discard: () => { clear(); options.onDiscard(); } };
}
