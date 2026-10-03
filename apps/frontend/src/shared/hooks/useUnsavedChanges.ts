import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { askConfirm } from '../api/confirm';

const DEFAULT_MESSAGE = 'Tienes cambios sin guardar. ¿Quieres salir de esta pantalla?';

/**
 * Compara con el contenido al abrir. El router protege enlaces, navegación
 * programática y Atrás/Adelante, con el modal global de confirmación;
 * beforeunload protege recarga y cierre (ahí el navegador no admite modal propio).
 */
export function useUnsavedChanges(open: boolean, value: unknown, saving = false) {
  const snapshot = JSON.stringify(value);
  const [baseline, setBaseline] = useState(snapshot);
  useEffect(() => { setBaseline(snapshot); }, [open]); // captura al abrir/cerrar, no al escribir
  const active = open && snapshot !== baseline && !saving;
  const blocker = useBlocker(active);

  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let ignore = false;
    void askConfirm(DEFAULT_MESSAGE).then((leave) => {
      const current = blockerRef.current;
      if (ignore || current.state !== 'blocked') return;
      if (leave) current.proceed();
      else current.reset();
    });
    return () => { ignore = true; };
  }, [blocker.state]);

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
