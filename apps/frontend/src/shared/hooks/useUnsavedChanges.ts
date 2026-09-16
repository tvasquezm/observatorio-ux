import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';

const DEFAULT_MESSAGE = 'Tienes cambios sin guardar. ¿Quieres salir de esta pantalla?';

/**
 * Compara con el contenido al abrir. El router protege enlaces, navegación
 * programática y Atrás/Adelante; beforeunload protege recarga y cierre.
 */
export function useUnsavedChanges(open: boolean, value: unknown, saving = false) {
  const snapshot = JSON.stringify(value);
  const [baseline, setBaseline] = useState(snapshot);
  useEffect(() => { setBaseline(snapshot); }, [open]); // captura al abrir/cerrar, no al escribir
  const active = open && snapshot !== baseline && !saving;
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
}
