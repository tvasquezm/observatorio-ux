import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useDiscardChanges } from './useDiscardChanges';
import { useAuthStore } from '../../features/auth/store/useAuthStore';

const DEFAULT_MESSAGE = 'Tienes cambios sin guardar. ¿Quieres salir de esta pantalla?';

/**
 * Compara con el contenido al abrir. El router protege enlaces, navegación
 * programática y Atrás/Adelante; beforeunload protege recarga y cierre.
 */
export function useUnsavedChanges(open: boolean, value: unknown, saving = false, identity?: string) {
  const guard = useDiscardChanges(open, value, saving, identity);
  const ending = useAuthStore(s => s.sessionEnding);
  const notice = useAuthStore(s => s.sessionNotice);
  const active = guard.isDirty && !ending;
  const blocker = useBlocker(active);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (ending) { blocker.proceed(); return; }
    if (notice) { blocker.reset(); return; }
    if (window.confirm(DEFAULT_MESSAGE)) {
      window.dispatchEvent(new Event('observatorio-ux-discard-route-drafts'));
      blocker.proceed();
    }
    else blocker.reset();
  }, [blocker, ending, notice]);

  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [active]);

  return guard;
}
