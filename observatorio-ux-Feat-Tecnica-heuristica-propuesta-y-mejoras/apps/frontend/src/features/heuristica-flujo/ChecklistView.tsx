import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { avancePorCategoria, criterioRespondido, respuestaVacia } from './flujo-utils';

interface Props {
  config: ConfiguracionFlujo;
  respuestas: RespuestaCriterio[];
  hallazgos: HallazgoFlujo[];
  editable: boolean;
  onChange: (r: RespuestaCriterio) => void;
  onAddHallazgo: (criterioId: string) => void;
}

/** Vista de lista de comprobación: criterios agrupados por categoría con avance "n de N respondidos". */
export function ChecklistView({ config, respuestas, hallazgos, editable, onChange, onAddHallazgo }: Props) {
  return <>{avancePorCategoria(config, respuestas).map(({ categoria, criterios, respondidos }) => {
    const completa = respondidos === criterios.length;
    return <section key={categoria} className="hf-cat" aria-label={categoria}>
      <h3>{categoria}</h3>
      <p className="hf-avance">{respondidos} de {criterios.length} respondidos{completa ? ' · ✓ Categoría completa' : ''}</p>
      {criterios.map(c => {
        const r = respuestas.find(x => x.criterioId === c.id) ?? respuestaVacia(c.id);
        const niveles = escalaDe(config.metodologia, c).niveles;
        const respondido = criterioRespondido(config, c, respuestas.find(x => x.criterioId === c.id));
        const nombre = `crit-${c.id}`;
        return <fieldset key={c.id} className="hf-item">
          <legend>{c.nombre}</legend>
          {c.descripcion && <p>{c.descripcion}</p>}
          <div role="radiogroup" aria-label={c.nombre}>
            {niveles.map(n => <label key={n.id} className="hf-check" title={n.significado}>
              <input type="radio" name={nombre} checked={!r.noAplica && r.valor === n.id} onChange={() => onChange({ ...r, valor: n.id, noAplica: false })} />{n.etiqueta}
            </label>)}
            <label className="hf-check"><input type="radio" name={nombre} checked={r.noAplica} onChange={() => onChange({ ...r, valor: null, noAplica: true })} />N.A.</label>
          </div>
          <p className="hf-ayuda">{respondido ? '✓ Respondido' : r.noAplica ? 'Falta el motivo de "no aplica".' : 'Sin responder'}</p>
          {r.noAplica && <label className="field">Motivo de no aplica<textarea value={r.motivo} onChange={e => onChange({ ...r, motivo: e.target.value })} /></label>}
          <details><summary>Notas</summary><label className="field">Notas de la valoración<textarea value={r.notas} onChange={e => onChange({ ...r, notas: e.target.value })} /></label></details>
          <p>{hallazgos.filter(h => h.criterioIds.includes(c.id)).length} hallazgos propios en este ítem. No registrar problemas no equivale a no aplica.</p>
          {editable && <button type="button" className="secondary" onClick={() => onAddHallazgo(c.id)}>Agregar hallazgo para {c.nombre}</button>}
        </fieldset>;
      })}
    </section>;
  })}</>;
}
