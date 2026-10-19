import type { ConfiguracionFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { criterioRespondido } from './flujo-utils';

export function NavegadorPreguntas({ config, respuestas, indice, onChange, sinBotones = false }: { config: ConfiguracionFlujo; respuestas: RespuestaCriterio[]; indice: number; onChange: (indice: number) => void; sinBotones?: boolean }) {
  const criterios = config.metodologia.criterios;
  const completos = criterios.filter(c => criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id))).length;
  return <nav className="hf-preguntas panel" aria-label="Preguntas de la revisión">
    {criterios.length > 12 ? <label className="field">Pregunta que estás revisando<select aria-label="Pregunta que estás revisando" value={indice} onChange={e => onChange(Number(e.target.value))}>{criterios.map((c, i) => <option key={c.id} value={i}>{i + 1}. {c.nombre}</option>)}</select></label> : <div className="hf-mapa-preguntas">{criterios.map((c, i) => { const r = respuestas.find(r => r.criterioId === c.id); const lista = criterioRespondido(config, c, r); return <button type="button" key={c.id} aria-label={`Pregunta ${i + 1}: ${c.nombre}${lista ? r?.noAplica ? ', no aplica' : ', respondida' : ', pendiente'}`} aria-current={i === indice ? 'true' : undefined} data-done={lista || undefined} onClick={() => onChange(i)}>{i + 1}{lista && <span aria-hidden="true">{r?.noAplica ? '−' : '✓'}</span>}</button>; })}</div>}
    <p role="status">{completos} de {criterios.length} preguntas respondidas</p>
    <progress max={criterios.length || 1} value={completos} aria-label="Preguntas respondidas" />
    {!sinBotones && <div className="hf-actions"><button type="button" className="secondary" disabled={indice === 0} onClick={() => onChange(indice - 1)}>Pregunta anterior</button><button type="button" className="secondary" disabled={indice >= criterios.length - 1} onClick={() => onChange(indice + 1)}>Pregunta siguiente</button></div>}
  </nav>;
}
