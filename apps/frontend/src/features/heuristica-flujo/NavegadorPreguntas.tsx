import type { ConfiguracionFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { criterioRespondido } from './flujo-utils';

export function NavegadorPreguntas({ config, respuestas, indice, onChange }: { config: ConfiguracionFlujo; respuestas: RespuestaCriterio[]; indice: number; onChange: (indice: number) => void }) {
  const criterios = config.metodologia.criterios;
  const completos = criterios.filter(c => criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id))).length;
  return <nav className="hf-preguntas panel" aria-label="Preguntas de la revisión">
    <label className="field">Pregunta que estás revisando<select aria-label="Pregunta que estás revisando" value={indice} onChange={e => onChange(Number(e.target.value))}>{criterios.map((c, i) => <option key={c.id} value={i}>{i + 1}. {c.nombre}</option>)}</select></label>
    <p role="status">{completos} de {criterios.length} preguntas respondidas</p>
    <progress max={criterios.length || 1} value={completos} aria-label="Preguntas respondidas" />
    <div className="hf-actions"><button type="button" className="secondary" disabled={indice === 0} onClick={() => onChange(indice - 1)}>Pregunta anterior</button><span>Pregunta {criterios.length ? indice + 1 : 0} de {criterios.length}</span><button type="button" className="secondary" disabled={indice >= criterios.length - 1} onClick={() => onChange(indice + 1)}>Pregunta siguiente</button></div>
  </nav>;
}
