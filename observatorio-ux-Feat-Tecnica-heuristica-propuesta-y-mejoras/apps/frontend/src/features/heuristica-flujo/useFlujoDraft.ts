import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { useConfirm } from '../../shared/api/confirm';
import { flujoRequest } from './flujo.api';

export function useFlujoDraft<T>(evaluacion: EvaluacionFlujo, usuarioId: string, path: string, initial: T, onSaved: (e: EvaluacionFlujo) => void, extraPending = false, autoSave = true, draftIdentity = '') {
  const key = `heuristica:${usuarioId}:${evaluacion.id}:${path}:${draftIdentity}`;
  const restored = useRef<{ revision: number; base: string } | null>(null);
  const [draft, setDraft] = useState<T>(() => {
    try {
      const value = sessionStorage.getItem(key);
      if (!value) return initial;
      const parsed = JSON.parse(value);
      if (!parsed || !Number.isSafeInteger(parsed.revision) || typeof parsed.base !== 'string' || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data) || Object.keys(initial as object).some(k => !(k in parsed.data))) return initial;
      if (draftIdentity && parsed.data.previaId !== draftIdentity) return initial;
      restored.current = { revision: parsed.revision, base: parsed.base };
      return parsed.data as T;
    } catch { return initial; }
  });
  const [saved, setSaved] = useState(restored.current?.base ?? JSON.stringify(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [remote, setRemote] = useState<unknown>(null);
  const latest = useRef(draft);
  const savedRef = useRef(saved);
  const revision = useRef(restored.current?.revision ?? evaluacion.revision);
  const running = useRef<Promise<void> | null>(null);
  const failed = useRef(false);
  const mounted = useRef(true);
  const confirm = useConfirm();
  latest.current = draft;
  const dirty = JSON.stringify(draft) !== saved;
  useEffect(() => {
    if (dirty || saving) return;
    revision.current = evaluacion.revision;
    const snapshot = JSON.stringify(initial);
    latest.current = initial;
    savedRef.current = snapshot;
    setDraft(initial);
    setSaved(snapshot);
  }, [evaluacion.revision, dirty, saving]);
  const blocker = useBlocker(dirty || saving || extraPending);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm('Hay cambios sin guardar. El borrador se conserva en esta pestaña. ¿Salir?').then(ok => {
      if (ok) blocker.proceed(); else blocker.reset();
    });
  }, [blocker, confirm]);
  useEffect(() => {
    if (!dirty && !saving && !extraPending) return;
    const listener = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, saving, extraPending]);
  useEffect(() => {
    try { if (dirty) sessionStorage.setItem(key, JSON.stringify({ revision: revision.current, base: savedRef.current, data: draft })); else sessionStorage.removeItem(key); }
    catch { setError('No se pudo conservar el borrador local. Guarda antes de salir.'); }
  }, [draft, dirty, saved, key]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function save(): Promise<void> {
    if (running.current) return running.current;
    if (JSON.stringify(latest.current) === savedRef.current) return;
    failed.current = false;
    setError('');
    setSaving(true);
    const promise = (async () => {
      try {
        while (JSON.stringify(latest.current) !== savedRef.current) {
          const snapshot = JSON.stringify(latest.current);
          const body = JSON.parse(snapshot);
          const result = await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/${path}`, 'PATCH', {
            revision: revision.current, ...(path === 'configuracion' ? { configuracion: body } : body),
          });
          revision.current = result.revision;
          savedRef.current = snapshot;
          if (mounted.current) { setSaved(snapshot); setLastSaved(result.updatedAt); onSaved(result); }
        }
      } catch (e) {
        failed.current = true;
        if (mounted.current) setError(e instanceof Error ? e.message : 'No se pudo guardar. Tu borrador se conserva.');
        throw e;
      } finally { running.current = null; if (mounted.current) setSaving(false); }
    })();
    running.current = promise;
    return promise;
  }
  useEffect(() => {
    if (!dirty || failed.current || !autoSave) return;
    const timer = window.setTimeout(() => { void save().catch(() => {}); }, 800);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, autoSave]);
  return { draft, setDraft, dirty, saving, error, lastSaved, save, getRevision: () => revision.current,
    remote, reloadRevision: async () => {
      const result = await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}`);
      setRemote(path === 'configuracion' ? result.configuracion : path === 'trabajo' ? result.trabajos.find(t => t.evaluadorId === usuarioId) : path === 'consenso' ? result.consenso : result.comparacion);
      revision.current = result.revision;
      onSaved(result);
    },
    confirmLeave: () => dirty || saving || extraPending ? confirm('Hay cambios sin guardar o evidencia pendiente. ¿Salir conservando el borrador de texto en esta pestaña?') : Promise.resolve(true) };
}
