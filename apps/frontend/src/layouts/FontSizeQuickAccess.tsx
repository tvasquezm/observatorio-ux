import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../shared/components/ui/Icon';
import { FontSizePicker, type FontSizePickerProps } from './FontSizePicker';

export function FontSizeQuickAccess(props: FontSizePickerProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="font-size-quick-access" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="secondary icon-button"
        aria-label="Tamaño del texto"
        title="Tamaño del texto"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(current => !current)}
      >
        <Icon name="texto" size={20} />
      </button>
      <div id={panelId} className="font-size-quick-panel" hidden={!open}>
        {open && <FontSizePicker {...props} />}
      </div>
    </div>
  );
}
