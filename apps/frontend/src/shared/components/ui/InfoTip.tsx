import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';

interface InfoTipProps {
  label: string;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
  visibleLabel?: string;
}

export function InfoTip({ label, children, className, align = 'end', visibleLabel }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<CSSProperties | undefined>(undefined);
  const panelId = useId();

  // El panel se ubica con coordenadas de la ventana: así nunca queda cortado por el borde
  // de la pantalla ni por un contenedor con desplazamiento (overflow).
  useLayoutEffect(() => {
    if (!open) { setPos(undefined); return; }
    function place() {
      const btn = btnRef.current; const panel = panelRef.current;
      if (!btn || !panel) return;
      const r = btn.getBoundingClientRect();
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = window.innerHeight;
      const w = panel.offsetWidth; const h = panel.offsetHeight;
      if (!w) return;
      const margin = 8;
      let left = align === 'start' ? r.left : r.right - w;
      left = Math.max(margin, Math.min(left, vw - w - margin));
      let top = r.bottom + 6;
      if (top + h > vh - margin && r.top - h - 6 >= margin) top = r.top - h - 6;
      setPos({ position: 'fixed', top, left, right: 'auto' });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, align]);

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
        ref={btnRef}
        type="button"
        className="info-tip-btn"
        data-has-label={visibleLabel ? true : undefined}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
      >
        <Icon name="info" size={20} />
        {visibleLabel && <span>{visibleLabel}</span>}
      </button>
      <span ref={panelRef} style={pos} id={panelId} role="note" className={`info-tip-panel${align === 'start' ? ' start' : ''}${open ? ' open' : ''}`}>
        {children}
      </span>
    </span>
  );
}
