import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useDiscardChanges } from './useDiscardChanges';

const DEFAULT_MESSAGE = 'Tienes cambios sin guardar. ¿Quieres salir de esta pantalla?';

/**
 * Compara con el contenido al abrir. El router protege enlaces, navegación
 * programática y Atrás/Adelante; beforeunload protege recarga y cierre.
 */
export function useUnsavedChanges(open: boolean, value: unknown, saving = false, identity?: string) {
  const guard = useDiscardChanges(open, value, saving, identity);
  const active = guard.isDirty;
  const blocker = useBlocker(active);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(DEFAULT_MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

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
