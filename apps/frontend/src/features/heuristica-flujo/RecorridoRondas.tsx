import type { ReactNode } from 'react';
import type { ConfiguracionFlujo } from '@observatorio-ux/shared-types';
import { armarRondas } from './rondas';

/** Cabecera de ronda y selector de rondas. `indice` y `onIrA` son posiciones de criterio en la metodologia. */
export function RecorridoRondas({ config, indice, onIrA, children }: { config: ConfiguracionFlujo; indice: number; onIrA: (indice: number) => void; children: ReactNode }) {
  const criterios = config.metodologia.criterios;
  const rondas = armarRondas(criterios);
  const actual = Math.max(0, rondas.findIndex(r => r.criterios.some(c => c.id === criterios[indice]?.id)));
  const ronda = rondas[actual];
  if (!ronda) return <>{children}</>;
  return <div className="hf-rondas">
    <div className="hf-ronda-linea"><p className="hf-ronda-titulo"><strong>Ronda {actual + 1} de {rondas.length}</strong> &middot; {ronda.categorias.join(', ')}</p>
    {rondas.length > 1 && <nav className="hf-vistas" aria-label="Rondas de la revisión">{rondas.map((r, i) => <button type="button" key={r.criterios[0].id} aria-current={i === actual ? 'true' : undefined} aria-label={`Ronda ${i + 1}: ${r.categorias.join(', ')}`} onClick={() => onIrA(criterios.findIndex(c => c.id === r.criterios[0].id))}>{i + 1}</button>)}</nav>}</div>
    {children}
  </div>;
}
