import { useState } from 'react';
import { detectarDiscrepancias } from '@observatorio-ux/shared-types';
import type { DecisionCriterio, DecisionHallazgo, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { Field } from './ConfiguracionEditor';
import { EvidenciaEditor } from './EvidenciaEditor';
import { HallazgoEditor, SaveStatus, ValoracionEditor } from './TrabajoEditor';
import { flujoRequest } from './flujo.api';
import { hallazgoVacio, respuestaVacia } from './flujo-utils';
import { useFlujoDraft } from './useFlujoDraft';

export function ConsensoEditor({ evaluacion, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const state = useFlujoDraft(evaluacion, usuarioId, 'consenso', { criterios: evaluacion.consenso.criterios, hallazgos: evaluacion.consenso.hallazgos }, onSaved);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const agenda = detectarDiscrepancias(evaluacion.configuracion, evaluacion.trabajos);
  const originales = evaluacion.trabajos.flatMap(t => t.hallazgos.map(h => ({ ...h, evaluador: t.nombre })));
  const cubiertos = new Set(state.draft.hallazgos.flatMap(h => h.origenIds));
  const update = (h: DecisionHallazgo) => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.map(x => x.id === h.id ? h : x) });
  async function action(action: 'aprobar' | 'consolidar') {
    setBusy(true); setError('');
    try { await state.save(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/${action}`, 'POST', { revision: state.getRevision() })); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción'); } finally { setBusy(false); }
  }
  return <>
    <button type="button" className="text-button" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>← Evaluaciones</button>
    <div className="page-head"><div><h2>Consenso · {evaluacion.configuracion.nombre}</h2><p>Todos los expertos entregaron. Revisen los originales y acuerden cada criterio y problema. La agenda orienta; no decide por promedio o mayoría.</p></div></div>
    <button type="button" disabled={state.saving || busy} onClick={async () => { if (!(await state.confirmLeave())) return; try { await state.reloadRevision(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); } }}>Actualizar consenso y confirmaciones</button>
    <section className="panel"><div className="panel-head"><h2>Agenda de discrepancias</h2></div>
      {agenda.criterios.length ? <ul>{agenda.criterios.map(c => <li key={c.criterioId}>{evaluacion.configuracion.metodologia.criterios.find(x => x.id === c.criterioId)?.nombre}: {c.motivos.join(' · ')}</li>)}</ul> : <p>No se detectaron diferencias de valoración. Confirmen de todos modos el acuerdo.</p>}
      <p>{agenda.hallazgos.length} hallazgos individuales para revisar. {originales.filter(h => !cubiertos.has(h.id)).length} originales sin decisión.</p>
    </section>
    <SaveStatus {...state} />
    <fieldset disabled={busy}><legend>Acuerdo por criterio</legend>{evaluacion.configuracion.metodologia.criterios.map(c => {
      const r: DecisionCriterio = state.draft.criterios.find(x => x.criterioId === c.id) ?? { ...respuestaVacia(c.id), justificacion: '' };
      return <fieldset key={c.id}><legend>{c.nombre}</legend>
        <ul>{evaluacion.trabajos.map(t => { const own = t.respuestas.find(x => x.criterioId === c.id); return <li key={t.evaluadorId}>{t.nombre}: {own?.noAplica ? `No aplica: ${own.motivo}` : evaluacion.configuracion.metodologia.escala.niveles.find(n => n.id === own?.valor)?.etiqueta ?? 'Sin evaluar'} {own?.notas && `· ${own.notas}`}</li>; })}</ul>
        <ValoracionEditor config={evaluacion.configuracion} respuesta={r} onChange={x => state.setDraft({ ...state.draft, criterios: [...state.draft.criterios.filter(x => x.criterioId !== c.id), { ...r, ...x }] })} />
        <Field label="Justificación del acuerdo"><textarea value={r.justificacion} onChange={e => state.setDraft({ ...state.draft, criterios: [...state.draft.criterios.filter(x => x.criterioId !== c.id), { ...r, justificacion: e.target.value }] })} /></Field>
      </fieldset>;
    })}</fieldset>
    <section className="panel"><div className="panel-head"><h2>Hallazgos originales preservados</h2></div>
      {originales.map(h => <details key={h.id}><summary>{h.evaluador}: {h.titulo} · {cubiertos.has(h.id) ? 'Vinculado a decisión' : 'Pendiente de decisión'}</summary><p>ID de origen: {h.id}</p><p>{h.pantalla}: {h.descripcion}</p><p>Severidad {h.severidad} · Prioridad {h.prioridad}</p><p>Recomendación: {h.recomendacion}</p><p>{h.notas}</p><EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={false} /></details>)}
      <fieldset disabled={busy}><legend>Seleccionar originales para aceptar, fusionar o descartar</legend>{originales.map(h => <label className="hf-check" key={h.id}><input type="checkbox" checked={seleccion.includes(h.id)} disabled={cubiertos.has(h.id)} onChange={e => setSeleccion(e.target.checked ? [...seleccion, h.id] : seleccion.filter(x => x !== h.id))} />{h.evaluador}: {h.titulo}</label>)}</fieldset>
      <button type="button" disabled={!seleccion.length || busy} onClick={() => {
        const sources = originales.filter(x => seleccion.includes(x.id) && !cubiertos.has(x.id));
        if (!sources.length) return;
        const first = sources[0];
        state.setDraft({ ...state.draft, hallazgos: [...state.draft.hallazgos, { ...hallazgoVacio(first.criterioIds[0]), titulo: first.titulo, pantalla: first.pantalla, descripcion: first.descripcion, recomendacion: first.recomendacion, severidad: first.severidad, prioridad: first.prioridad, criterioIds: [...new Set(sources.flatMap(x => x.criterioIds))], evidenciaIds: [...new Set(sources.flatMap(x => x.evidenciaIds))], origenIds: sources.map(x => x.id), decision: 'PENDIENTE', justificacion: '' }] }); setSeleccion([]);
      }}>Crear decisión de los originales seleccionados</button>
    </section>
    <section className="panel"><div className="panel-head"><h2>Decisiones y problemas únicos</h2></div>{state.draft.hallazgos.map((h, i) => <fieldset key={h.id} disabled={busy}><legend>Decisión {i + 1}: {h.titulo}</legend><p>Orígenes preservados: {h.origenIds.join(', ')} · {h.origenIds.length > 1 ? 'Fusión' : 'Hallazgo individual'}</p>
      <Field label="Decisión del consenso"><select value={h.decision} onChange={e => update({ ...h, decision: e.target.value as DecisionHallazgo['decision'] })}><option value="PENDIENTE">Pendiente</option><option value="ACEPTADO">Aceptar problema único</option><option value="DESCARTADO">Descartar conservando original</option></select></Field>
      <HallazgoEditor value={h} config={evaluacion.configuracion} onChange={x => update({ ...h, ...x })} />
      <Field label="Justificación de aceptación, fusión o descarte"><textarea value={h.justificacion} onChange={e => update({ ...h, justificacion: e.target.value })} /></Field>
      <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={false} />
      <button type="button" onClick={() => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.filter(x => x.id !== h.id) })}>Reabrir orígenes de decisión {i + 1}</button>
    </fieldset>)}</section>
    <SaveStatus {...state} />
    <section className="panel"><div className="panel-head"><h2>Confirmación de todos los expertos</h2></div><p>Editar el consenso revoca las confirmaciones previas. {state.dirty ? 'Hay cambios pendientes: las aprobaciones visibles corresponden a la versión guardada.' : ''}</p>
      <ul>{evaluacion.trabajos.map(t => <li key={t.evaluadorId}>{t.nombre}: {evaluacion.consenso.aprobadoPor.includes(t.evaluadorId) && !state.dirty ? 'Confirmado' : 'Confirmación pendiente'}</li>)}</ul>
      <div className="hf-actions">{evaluacion.configuracion.evaluadorIds.includes(usuarioId) && <button type="button" disabled={busy || state.saving} onClick={() => void action('aprobar')}>Confirmar el consenso vigente</button>}
      {evaluacion.coordinadorId === usuarioId && <button type="button" className="primary" disabled={busy || state.saving || state.dirty || !evaluacion.configuracion.evaluadorIds.every(id => evaluacion.consenso.aprobadoPor.includes(id))} onClick={() => void action('consolidar')}>Consolidar evaluación</button>}</div>
    </section>
    {error && <p role="alert" className="hf-error">{error}</p>}
  </>;
}
