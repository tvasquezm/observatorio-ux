import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface TechniquePageProps {
  cabecera: ReactNode;
  proceso?: ReactNode;
  resumen?: ReactNode;
  formulario?: ReactNode;
  lista?: ReactNode;
  comentarios?: ReactNode;
  className?: string;
}

/**
 * Esqueleto común de las técnicas. El orden de las secciones lo fija este
 * componente (cabecera con instrucciones, proceso, resumen, formulario, lista,
 * comentarios): una página no puede reordenarlas. Los slots vacíos no se pintan.
 *
 * Cuando el formulario pasa de ausente a presente (nunca en el primer montaje) la
 * página baja hasta él y deja el foco en su título.
 */
export function TechniquePage({
  cabecera,
  proceso,
  resumen,
  formulario,
  lista,
  comentarios,
  className,
}: TechniquePageProps) {
  const hayFormulario = formulario !== undefined && formulario !== null && formulario !== false;
  const ancla = useRef<HTMLDivElement>(null);
  const habiaFormulario = useRef<boolean | null>(null);

  useEffect(() => {
    const antes = habiaFormulario.current;
    habiaFormulario.current = hayFormulario;
    if (antes !== false || !hayFormulario) return;
    const el = ancla.current;
    if (!el) return;
    const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    el.scrollIntoView?.({ block: 'start', behavior: reducirMovimiento ? 'auto' : 'smooth' });
    const destino = el.querySelector<HTMLElement>('h2, h3') ?? el;
    destino.tabIndex = -1;
    destino.focus({ preventScroll: true });
  }, [hayFormulario]);

  return (
    <div className={`artifact-page technique-page${className ? ` ${className}` : ''}`}>
      {cabecera}
      {proceso}
      {resumen}
      {hayFormulario && <div ref={ancla} className="technique-form-anchor">{formulario}</div>}
      {lista}
      {comentarios}
    </div>
  );
}
