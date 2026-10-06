import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

interface InfoTipProps {
  label: string;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}

export function InfoTip({ label, children, className, align = 'end' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  function close() {
    setPinned(false);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  function toggle() {
    const next = !pinned;
    setPinned(next);
    setOpen(next);
  }

  return (
    <span
      ref={rootRef}
      className={`info-tip${className ? ` ${className}` : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && !pinned) setOpen(false);
      }}
    >
      <button
        type="button"
        className="info-tip-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
      >
        <Icon name="info" size={16} />
      </button>
      <span id={panelId} role="note" className={`info-tip-panel${align === 'start' ? ' start' : ''}${open ? ' open' : ''}`}>
        {children}
      </span>
    </span>
  );
}
