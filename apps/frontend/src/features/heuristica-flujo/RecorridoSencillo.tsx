import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/** Keep editors mounted so changing views preserves drafts and pending uploads. */
export function RecorridoSencillo({ pasos, acciones }: { pasos: { titulo: string; ayuda: string; contenido: ReactNode }[]; acciones?: ReactNode }) {
  const [indice, setIndice] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function ir(i: number) { setIndice(i); tabs.current[i]?.focus(); }
  return <section className="hf-diapositivas">
    <div className="hf-vistas" role="tablist" aria-label="Vistas de la revisión">{pasos.map((p, i) => <button type="button" role="tab" key={p.titulo} id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`} aria-selected={i === indice} tabIndex={i === indice ? 0 : -1} ref={el => { tabs.current[i] = el; }} onClick={() => setIndice(i)} onKeyDown={e => {
      const nuevo = e.key === 'ArrowRight' ? (i + 1) % pasos.length : e.key === 'ArrowLeft' ? (i + pasos.length - 1) % pasos.length : e.key === 'Home' ? 0 : e.key === 'End' ? pasos.length - 1 : null;
      if (nuevo !== null) { e.preventDefault(); ir(nuevo); }
    }}>{p.titulo}</button>)}</div>
    {pasos.map((p, i) => <div key={p.titulo} id={`${id}-panel-${i}`} role="tabpanel" aria-labelledby={`${id}-tab-${i}`} hidden={i !== indice} className="hf-contenido"><p className="hf-ayuda">{p.ayuda}</p>{p.contenido}</div>)}
    <div className="hf-actions hf-paso-acciones">{indice > 0 && <button type="button" className="secondary" onClick={() => ir(indice - 1)}>Anterior</button>}{indice < pasos.length - 1 ? <button type="button" className="primary" onClick={() => ir(indice + 1)}>Continuar</button> : acciones}</div>
  </section>;
}
