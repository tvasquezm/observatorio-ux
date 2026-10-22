import { useEffect, useRef, useState } from 'react';
import { RecorridoSencillo } from './RecorridoSencillo';
import { NavegadorPreguntas } from './NavegadorPreguntas';
import { detectarDiscrepancias, escalaDe } from '@observatorio-ux/shared-types';
import type { CriterioFlujo, DecisionCriterio, DecisionHallazgo, EvaluacionFlujo, MejoraAntesDespues } from '@observatorio-ux/shared-types';
import { Field } from './ConfiguracionEditor';
import { EvidenciaEditor } from './EvidenciaEditor';
import { HallazgoEditor, SaveStatus, ValoracionEditor } from './TrabajoEditor';
import { flujoRequest } from './flujo.api';
import { avancePorCategoria, esChecklist, etiquetasDiscrepancia, hallazgoVacio, respuestaVacia } from './flujo-utils';
import { useFlujoDraft } from './useFlujoDraft';

export function ConsensoEditor({ evaluacion, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const [indice, setIndice] = useState(0);
  const criterioActual = evaluacion.configuracion.metodologia.criterios[indice];
  const [subiendo, setSubiendo] = useState<Record<string, boolean>>({});
  const subiendoCapturas = Object.values(subiendo).some(Boolean);
  const state = useFlujoDraft(evaluacion, usuarioId, 'consenso', { criterios: evaluacion.consenso.criterios, hallazgos: evaluacion.consenso.hallazgos, positivos: evaluacion.consenso.positivos ?? [], conclusion: evaluacion.consenso.conclusion ?? '', mejoras: evaluacion.consenso.mejoras ?? [] }, onSaved, subiendoCapturas);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [aviso, setAviso] = useState('');
  const [nuevaId, setNuevaId] = useState<string | null>(null);
  const decisiones = useRef<Record<string, HTMLFieldSetElement | null>>({});
  useEffect(() => { if (!nuevaId) return; decisiones.current[nuevaId]?.focus(); setNuevaId(null); }, [nuevaId]);
  const agenda = detectarDiscrepancias(evaluacion.configuracion, evaluacion.trabajos);
  const checklist = esChecklist(evaluacion.configuracion);
  const originales = evaluacion.trabajos.flatMap(t => t.hallazgos.map(h => ({ ...h, evaluador: t.nombre })));
  const cubiertos = new Set(state.draft.hallazgos.flatMap(h => h.origenIds));
  const update = (h: DecisionHallazgo) => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.map(x => x.id === h.id ? h : x) });
  async function action(action: 'aprobar' | 'consolidar') {
    setBusy(true); setError('');
    try { await state.save(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/${action}`, 'POST', { revision: state.getRevision() })); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción'); } finally { setBusy(false); }
  }
  const bloqueCriterio = (c: CriterioFlujo) => {
      const r: DecisionCriterio = state.draft.criterios.find(x => x.criterioId === c.id) ?? { ...respuestaVacia(c.id), justificacion: '' };
      return <fieldset key={c.id} hidden={c.id !== criterioActual?.id}><legend>{c.nombre}</legend>
        <ul>{evaluacion.trabajos.map(t => { const own = t.respuestas.find(x => x.criterioId === c.id); return <li key={t.evaluadorId}>{t.nombre}: {own?.noAplica ? `No aplica${own.motivo ? `: ${own.motivo}` : ''}` : escalaDe(evaluacion.configuracion.metodologia, c).niveles.find(n => n.id === own?.valor)?.etiqueta ?? 'Sin evaluar'} {own?.notas && `· ${own.notas}`}</li>; })}</ul>
        <ValoracionEditor config={evaluacion.configuracion} respuesta={r} onChange={x => state.setDraft({ ...state.draft, criterios: [...state.draft.criterios.filter(x => x.criterioId !== c.id), { ...r, ...x }] })} />
        {!r.noAplica && <Field label="Justificación del acuerdo"><textarea value={r.justificacion} onChange={e => state.setDraft({ ...state.draft, criterios: [...state.draft.criterios.filter(x => x.criterioId !== c.id), { ...r, justificacion: e.target.value }] })} /></Field>}
      </fieldset>;
    };
  return <>
<<<<<<< HEAD
    <button type="button" className="secondary" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>Volver</button>
=======
    <button type="button" className="secondary" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>← Evaluaciones</button>
>>>>>>> origin/main
    <div className="page-head"><div><h2>Acuerdo del equipo · {evaluacion.configuracion.nombre}</h2><p>Todos terminaron su revisión. Ahora comparen sus respuestas, decidan juntos y preparen el informe.</p></div></div>
    <div className="hf-barra"><button type="button" className="ghost" disabled={state.saving || busy} onClick={async () => { if (!(await state.confirmLeave())) return; try { await state.reloadRevision(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); } }}>Actualizar consenso y confirmaciones</button>
    <SaveStatus {...state} /></div>
    <RecorridoSencillo pasos={[{ titulo: 'Acordar las respuestas', ayuda: 'Lean las respuestas de cada persona y elijan una respuesta común. Expliquen por qué están de acuerdo.', contenido: (<>
    <details className="panel"><summary>Ver preguntas donde hubo diferencias</summary>
      {agenda.criterios.length ? <ul>{agenda.criterios.map(c => <li key={c.criterioId}>{evaluacion.configuracion.metodologia.criterios.find(x => x.id === c.criterioId)?.nombre}: {c.motivos.join(' · ')}{checklist && ` Difieren: ${etiquetasDiscrepancia(evaluacion.configuracion, c)}`}</li>)}</ul> : <p>No se detectaron diferencias de valoración. Confirmen de todos modos el acuerdo.</p>}
      <p>{agenda.hallazgos.length} hallazgos individuales para revisar. {originales.filter(h => !cubiertos.has(h.id)).length} originales sin decisión.</p>
    </details>
    <NavegadorPreguntas config={evaluacion.configuracion} respuestas={state.draft.criterios} indice={indice} onChange={setIndice} />
    <fieldset disabled={busy}><legend>Acuerdo por criterio</legend>{checklist
      ? avancePorCategoria(evaluacion.configuracion, state.draft.criterios).map(g => <section hidden={!g.criterios.some(c => c.id === criterioActual?.id)} key={g.categoria} className="hf-cat" aria-label={g.categoria}><h3>{g.categoria}</h3><p className="hf-avance">{g.respondidos} de {g.criterios.length} con valoración acordada{g.respondidos === g.criterios.length ? ' · ✓ Categoría completa' : ''}</p>{g.criterios.map(bloqueCriterio)}</section>)
      : evaluacion.configuracion.metodologia.criterios.map(bloqueCriterio)}</fieldset>
    </>) }, { titulo: 'Revisar los problemas', ayuda: 'Seleccionen los problemas encontrados. Pueden unir los repetidos, aceptarlos o descartarlos con una razón. Los originales se conservan.', contenido: (<div className="hf-acordar-columnas">
    <section className="panel"><div className="panel-head"><h2>Problemas encontrados por el equipo</h2></div>
      {originales.map(h => <details key={h.id}><summary>{h.evaluador}: {h.titulo} · {cubiertos.has(h.id) ? 'Vinculado a decisión' : 'Pendiente de decisión'}</summary><p>ID de origen: {h.id}</p><p>{h.pantalla}: {h.descripcion}</p><p>Severidad {h.severidad} · Prioridad {h.prioridad}</p><p>Recomendación: {h.recomendacion}</p><p>{h.notas}</p><EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={false} /></details>)}
      <fieldset disabled={busy}><legend>Seleccionar originales para aceptar, fusionar o descartar</legend>{originales.map(h => <label className="hf-check" key={h.id}><input type="checkbox" checked={seleccion.includes(h.id)} disabled={cubiertos.has(h.id)} onChange={e => setSeleccion(e.target.checked ? [...seleccion, h.id] : seleccion.filter(x => x !== h.id))} />{h.evaluador}: {h.titulo}</label>)}</fieldset>
      {!seleccion.length && <p className="hf-ayuda" id="hf-ayuda-crear">{originales.every(h => cubiertos.has(h.id)) ? 'Todos los problemas ya tienen una decisión.' : 'Marca al menos un problema para crear una decisión.'}</p>}
      <button type="button" className="primary" aria-describedby={seleccion.length ? undefined : 'hf-ayuda-crear'} disabled={!seleccion.length || busy} onClick={() => {
        const sources = originales.filter(x => seleccion.includes(x.id) && !cubiertos.has(x.id));
        if (!sources.length) return;
        const first = sources[0];
        const nueva: DecisionHallazgo = { ...hallazgoVacio(first.criterioIds[0]), titulo: first.titulo, pantalla: first.pantalla, descripcion: first.descripcion, recomendacion: first.recomendacion, severidad: first.severidad, prioridad: first.prioridad, criterioIds: [...new Set(sources.flatMap(x => x.criterioIds))], evidenciaIds: [...new Set(sources.flatMap(x => x.evidenciaIds))], origenIds: sources.map(x => x.id), decision: 'PENDIENTE', justificacion: '' };
        state.setDraft({ ...state.draft, hallazgos: [...state.draft.hallazgos, nueva] }); setSeleccion([]);
        setAviso(`Decisión ${state.draft.hallazgos.length + 1} creada con ${sources.length} ${sources.length === 1 ? 'problema' : 'problemas'}. Está en "Decisiones y problemas únicos", más abajo.`); setNuevaId(nueva.id);
      }}>Crear decisión de los originales seleccionados</button>
    </section>
    <section className="panel"><div className="panel-head"><h2>Decisiones y problemas únicos</h2></div><p role="status" className="hf-aviso">{aviso}</p>{state.draft.hallazgos.map((h, i) => <fieldset key={h.id} disabled={busy} tabIndex={-1} ref={el => { decisiones.current[h.id] = el; }}><legend>Decisión {i + 1}: {h.titulo}</legend><p>Orígenes preservados: {h.origenIds.join(', ')} · {h.origenIds.length > 1 ? 'Fusión' : 'Hallazgo individual'}</p>
      <Field label="Decisión del consenso"><select value={h.decision} onChange={e => update({ ...h, decision: e.target.value as DecisionHallazgo['decision'] })}><option value="PENDIENTE">Pendiente</option><option value="ACEPTADO">Aceptar problema único</option><option value="DESCARTADO">Descartar conservando original</option></select></Field>
      <HallazgoEditor value={h} config={evaluacion.configuracion} onChange={x => update({ ...h, ...x })} />
      <Field label="Justificación de aceptación, fusión o descarte"><textarea value={h.justificacion} onChange={e => update({ ...h, justificacion: e.target.value })} /></Field>
      <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={false} />
      <button type="button" className="danger" onClick={() => { setAviso(''); state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.filter(x => x.id !== h.id) }); }}>Reabrir orígenes de decisión {i + 1}</button>
    </fieldset>)}</section>
    </div>) }, { titulo: 'Preparar el informe', ayuda: 'Escriban qué recomiendan mejorar. Cada persona debe confirmar el acuerdo antes de que el coordinador prepare el informe.', contenido: (<>
    <details className="panel"><summary>Agregar lo que funciona bien (opcional)</summary>
      <fieldset disabled={busy}><legend>Lo que funciona bien en el producto</legend>{state.draft.positivos.map((p, i) => <fieldset key={p.id}><legend>Aspecto positivo {i + 1}: {p.titulo || 'Sin título'}</legend>
        <Field label={`Título del aspecto positivo ${i + 1}`}><input maxLength={300} value={p.titulo} onChange={e => state.setDraft({ ...state.draft, positivos: state.draft.positivos.map(x => x.id === p.id ? { ...x, titulo: e.target.value } : x) })} /></Field>
        <Field label={`Descripción del aspecto positivo ${i + 1}`}><textarea maxLength={10000} value={p.descripcion} onChange={e => state.setDraft({ ...state.draft, positivos: state.draft.positivos.map(x => x.id === p.id ? { ...x, descripcion: e.target.value } : x) })} /></Field>
        <button type="button" className="danger" onClick={() => state.setDraft({ ...state.draft, positivos: state.draft.positivos.filter(x => x.id !== p.id) })}>Quitar aspecto positivo {i + 1}</button>
      </fieldset>)}
      <button type="button" className="secondary" disabled={state.draft.positivos.length >= 200} onClick={() => state.setDraft({ ...state.draft, positivos: [...state.draft.positivos, { id: crypto.randomUUID(), titulo: '', descripcion: '' }] })}>Agregar aspecto positivo</button></fieldset>
    </details>
    <details className="panel"><summary>Agregar imágenes de antes y después (opcional)</summary>
      <p>Registra cambios propuestos o aplicados al prototipo, con capturas del estado anterior y del estado posterior.</p>
      <fieldset disabled={busy}><legend>Mejoras del informe</legend>{state.draft.mejoras.map((m, i) => {
        const cambiar = (patch: Partial<MejoraAntesDespues>) => state.setDraft(prev => ({ ...prev, mejoras: prev.mejoras.map(x => x.id === m.id ? { ...x, ...patch } : x) }));
        const lado = (clave: 'antesIds' | 'despuesIds', nombre: string) => <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={m[clave]} editable={!busy} sinAnotar max={10} etiqueta={`${nombre} de la mejora ${i + 1}`} onChange={ids => cambiar(clave === 'antesIds' ? { antesIds: ids } : { despuesIds: ids })} onPendingChange={v => setSubiendo(p => p[m.id + clave] === v ? p : { ...p, [m.id + clave]: v })} />;
        return <fieldset key={m.id}><legend>Mejora {i + 1}: {m.titulo || 'Sin título'}</legend>
          <Field label={`Título de la mejora ${i + 1}`}><input maxLength={300} value={m.titulo} onChange={e => cambiar({ titulo: e.target.value })} /></Field>
          <Field label={`Descripción de la mejora ${i + 1}`}><textarea maxLength={10000} value={m.descripcion} onChange={e => cambiar({ descripcion: e.target.value })} /></Field>
          <h3>Antes</h3>{lado('antesIds', 'antes')}
          <h3>Después</h3>{lado('despuesIds', 'después')}
          <button type="button" className="danger" disabled={subiendoCapturas} onClick={() => state.setDraft(prev => ({ ...prev, mejoras: prev.mejoras.filter(x => x.id !== m.id) }))}>Quitar mejora {i + 1}</button>
        </fieldset>;
      })}
      <button type="button" className="secondary" disabled={state.draft.mejoras.length >= 100} onClick={() => state.setDraft(prev => ({ ...prev, mejoras: [...prev.mejoras, { id: crypto.randomUUID(), titulo: '', descripcion: '', antesIds: [], despuesIds: [] }] }))}>Agregar mejora</button></fieldset>
    </details>
    <section className="panel"><div className="panel-head"><h2>Conclusión y recomendaciones finales</h2></div>
      <Field label="Conclusión y recomendaciones finales"><textarea maxLength={10000} disabled={busy} value={state.draft.conclusion} onChange={e => state.setDraft({ ...state.draft, conclusion: e.target.value })} /></Field>
    </section>
    <SaveStatus {...state} />
    <section className="panel"><div className="panel-head"><h2>Confirmación de todos los expertos</h2></div><p>Editar el consenso revoca las confirmaciones previas. {state.dirty ? 'Hay cambios pendientes: las aprobaciones visibles corresponden a la versión guardada.' : ''}</p>
      <ul>{evaluacion.trabajos.map(t => <li key={t.evaluadorId}>{t.nombre}: {evaluacion.consenso.aprobadoPor.includes(t.evaluadorId) && !state.dirty ? 'Confirmado' : 'Confirmación pendiente'}</li>)}</ul>
      <div className="hf-actions">{evaluacion.configuracion.evaluadorIds.includes(usuarioId) && <button type="button" className="secondary" disabled={busy || state.saving} onClick={() => void action('aprobar')}>Confirmar acuerdo</button>}
      {evaluacion.coordinadorId === usuarioId && <button type="button" className="primary" disabled={busy || state.saving || state.dirty || !evaluacion.configuracion.evaluadorIds.every(id => evaluacion.consenso.aprobadoPor.includes(id))} onClick={() => void action('consolidar')}>Preparar informe</button>}</div>
    </section>
    </>) }]} />
    {error && <p role="alert" className="hf-error">{error}</p>}
  </>;
}
