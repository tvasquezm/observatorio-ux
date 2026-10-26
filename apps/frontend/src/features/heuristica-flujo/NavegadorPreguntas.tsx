import type { ReactNode } from 'react';
import type { ConfiguracionFlujo, CriterioFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { criterioRespondido } from './flujo-utils';
import { agruparPorItem, esUnaTabla } from './MatrizItem';

/** Barra de avance de la revisión: tarjetas numeradas por sección y conteo de preguntas respondidas. */
export function NavegadorPreguntas({ config, respuestas, indice, onChange, children }: { config: ConfiguracionFlujo; respuestas: RespuestaCriterio[]; indice: number; onChange: (indice: number) => void; children?: ReactNode }) {
  const criterios = config.metodologia.criterios;
  const respondido = (c: CriterioFlujo) => criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id));
  const completos = criterios.filter(respondido).length;
  const grupos = agruparPorItem(config, criterios);
  const conSecciones = grupos.length > 1 && !esUnaTabla(grupos);
  const actualId = criterios[indice]?.id;
  return <nav className="hf-preguntas hf-preguntas-barra" aria-label="Preguntas de la revisión">
    {conSecciones && <div className="hf-segmentos">{grupos.map((g, i) => {
      const n = g.criterios.filter(respondido).length;
      const lista = n === g.criterios.length;
      return <button type="button" key={g.categoria} title={g.categoria} aria-label={`Sección ${i + 1}: ${g.categoria}, ${n} de ${g.criterios.length} respondidas${lista ? ', completa' : ''}`} aria-current={g.criterios.some(c => c.id === actualId) ? 'true' : undefined} data-done={lista || undefined} onClick={() => onChange(criterios.indexOf(g.criterios[0]))}>{i + 1}{lista && <span aria-hidden="true">✓</span>}</button>;
    })}</div>}
    <p role="status">{completos} de {criterios.length} preguntas respondidas</p>
    {children}
  </nav>;
}
