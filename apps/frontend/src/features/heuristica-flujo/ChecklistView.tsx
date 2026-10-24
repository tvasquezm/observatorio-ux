import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { EvidenciaEditor } from './EvidenciaEditor';
import { avancePorCategoria, criterioRespondido, respuestaVacia, textoProblemas } from './flujo-utils';

interface Props {
  criteriosVisibles?: string[];
  config: ConfiguracionFlujo;
  respuestas: RespuestaCriterio[];
  hallazgos: HallazgoFlujo[];
  editable: boolean;
  onChange: (r: RespuestaCriterio) => void;
  onAddHallazgo: (criterioId: string) => void;
  proyectoId: string; evaluacionId: string; onEvidencePending?: (pending: boolean) => void;
}

/** Lista de comprobación: criterios agrupados por categoría con avance "n de N respondidos"; `criteriosVisibles` acota a una ronda. */
export function ChecklistView({ criteriosVisibles, config, respuestas, hallazgos, editable, onChange, onAddHallazgo, proyectoId, evaluacionId, onEvidencePending }: Props) {
  return <>{avancePorCategoria(config, respuestas).map(({ categoria, criterios, respondidos }) => {
    const completa = respondidos === criterios.length;
    return <section hidden={!!criteriosVisibles && !criterios.some(c => criteriosVisibles.includes(c.id))} key={categoria} className="hf-cat" aria-label={categoria}>
      <h3>{categoria}</h3>
      <p className="hf-avance">{respondidos} de {criterios.length} respondidos{completa ? ' · ✓ Categoría completa' : ''}</p>
      {criterios.map(c => {
        const r = respuestas.find(x => x.criterioId === c.id) ?? respuestaVacia(c.id);
        const niveles = escalaDe(config.metodologia, c).niveles;
        const respondido = criterioRespondido(config, c, respuestas.find(x => x.criterioId === c.id));
        const nombre = `crit-${c.id}`;
        return <fieldset hidden={!!criteriosVisibles && !criteriosVisibles.includes(c.id)} key={c.id} className="hf-item">
          <legend>{c.nombre}</legend>
          {c.descripcion && <p>{c.descripcion}</p>}
          <div className="hf-opciones" role="radiogroup" aria-label={c.nombre}>
            {niveles.map(n => <label key={n.id} className="hf-opcion" title={n.significado}>
              <input type="radio" name={nombre} checked={!r.noAplica && r.valor === n.id} onChange={() => onChange({ ...r, valor: n.id, noAplica: false })} />{n.etiqueta}
            </label>)}
            <label className="hf-opcion"><input type="radio" name={nombre} checked={r.noAplica} onChange={() => onChange({ ...r, noAplica: true, valor: null })} />No aplica</label>
          </div>
          <p className="hf-ayuda">{respondido ? r.noAplica ? '✓ No aplica · registrado' : '✓ Respondido' : 'Sin responder'}</p>

          <details><summary>Notas</summary><label className="field">Notas de la valoración<textarea value={r.notas} onChange={e => onChange({ ...r, notas: e.target.value })} /></label><EvidenciaEditor proyectoId={proyectoId} evaluacionId={evaluacionId} evidenciaIds={r.evidenciaIds ?? []} editable={editable} onChange={ids => onChange({ ...r, evidenciaIds: ids })} onPendingChange={onEvidencePending} etiqueta="de la valoración" />{r.motivo && <p>Nota anterior: {r.motivo}</p>}</details>
          <p>{textoProblemas(hallazgos.filter(h => h.criterioIds.includes(c.id)).length, 'este ítem')} Sin problemas no es lo mismo que "No aplica".</p>
          {editable && <button type="button" className="secondary" onClick={() => onAddHallazgo(c.id)}>Agregar problema para {c.nombre}</button>}
        </fieldset>;
      })}
    </section>;
  })}</>;
}
