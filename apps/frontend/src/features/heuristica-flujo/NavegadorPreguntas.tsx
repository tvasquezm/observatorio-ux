import type { ReactNode } from 'react';
import type { ConfiguracionFlujo, CriterioFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { criterioRespondido } from './flujo-utils';
import { agruparPorItem, esUnaTabla } from './MatrizItem';

/** Barra de avance de la revisión: tarjetas numeradas por sección y conteo de preguntas respondidas.
 *  Las secciones ya visitadas que quedaron con preguntas sin responder llevan un punto de alerta. */
export function NavegadorPreguntas({ config, respuestas, indice, onChange, visitadas, children }: { config: ConfiguracionFlujo; respuestas: RespuestaCriterio[]; indice: number; onChange: (indice: number) => void; visitadas?: ReadonlySet<string>; children?: ReactNode }) {
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
      const actual = g.criterios.some(c => c.id === actualId);
      const alerta = !lista && !actual && !!visitadas?.has(g.categoria);
      return <button type="button" key={g.categoria} title={g.categoria} aria-label={`Sección ${i + 1}: ${g.categoria}, ${n} de ${g.criterios.length} respondidas${lista ? ', completa' : alerta ? ', con preguntas sin responder' : ''}`} aria-current={actual ? 'true' : undefined} data-done={lista || undefined} data-alerta={alerta || undefined} onClick={() => onChange(criterios.indexOf(g.criterios[0]))}>{i + 1}{lista && <span aria-hidden="true">✓</span>}{alerta && <span className="hf-segmento-alerta" aria-hidden="true" />}</button>;
    })}</div>}
    <p role="status">{completos} de {criterios.length} preguntas respondidas</p>
    {children}
  </nav>;
}
