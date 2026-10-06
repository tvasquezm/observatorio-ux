import { useEffect, useRef, useState } from 'react';
import { useConfirm } from '../api/confirm';

/** Protege cierres y cambios de editor; los guardados exitosos pueden reiniciar directamente. */
export function useDiscardChanges(open: boolean, value: unknown, saving = false, identity?: string) {
  const snapshot = JSON.stringify(value);
  const [baseline, setBaseline] = useState(snapshot);
  useEffect(() => { setBaseline(snapshot); }, [open, identity]);
  const isDirty = open && snapshot !== baseline && !saving;
  const confirm = useConfirm();
  const pending = useRef<Promise<boolean> | null>(null);
  function confirmDiscard(): Promise<boolean> {
    if (saving) return Promise.resolve(false);
    if (!isDirty) return Promise.resolve(true);
    if (!pending.current) {
      pending.current = Promise.resolve(confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?', {
        confirmLabel: 'Descartar cambios', cancelLabel: 'Seguir editando',
      })).finally(() => { pending.current = null; });
    }
    return pending.current;
  }
  return { isDirty, confirmDiscard };
}
