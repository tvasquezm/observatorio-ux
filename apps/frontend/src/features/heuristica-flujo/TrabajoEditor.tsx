import { useRef, useState } from 'react';
import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { Field } from './campos';
import { NavegadorPreguntas } from './NavegadorPreguntas';
import { EvidenciaEditor } from './EvidenciaEditor';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import { ChecklistView } from './ChecklistView';
import { criterioRespondido, esChecklist, hallazgoVacio, pendientesTrabajo, respuestaVacia } from './flujo-utils';

export function ValoracionEditor({ config, respuesta, onChange }: { config: ConfiguracionFlujo; respuesta: RespuestaCriterio; onChange: (r: RespuestaCriterio) => void }) {
  const criterio = config.metodologia.criterios.find(c => c.id === respuesta.criterioId);
  const niveles = (criterio ? escalaDe(config.metodologia, criterio) : config.metodologia.escala).niveles;
  return <><div className="hf-grid">
    <Field label="¿Esta pregunta aplica al producto?"><select aria-label="¿Esta pregunta aplica al producto?" value={respuesta.noAplica ? 'no-aplica' : 'aplica'} onChange={e => onChange({ ...respuesta, noAplica: e.target.value === 'no-aplica', valor: null })}><option value="aplica">Sí aplica</option><option value="no-aplica">No aplica</option></select></Field>
    {!respuesta.noAplica && <Field label="Valoración"><select aria-label="Valoración" value={respuesta.valor ?? ''} onChange={e => onChange({ ...respuesta, valor: e.target.value || null })}><option value="">Elige una respuesta</option>{niveles.map(n => <option key={n.id} value={n.id}>{n.etiqueta} — {n.significado}</option>)}</select></Field>}
    {respuesta.noAplica && <p className="hf-no-aplica" role="status">Esta pregunta queda fuera de la revisión. Puedes continuar.</p>}
    </div><details><summary>Agregar notas (opcional)</summary><Field label="Notas de la valoración"><textarea value={respuesta.notas} onChange={e => onChange({ ...respuesta, notas: e.target.value })} /></Field>{respuesta.motivo && <p className="hf-ayuda">Nota anterior: {respuesta.motivo}</p>}</details></>;

}
export function HallazgoEditor({ value, config, onChange }: { value: HallazgoFlujo; config: ConfiguracionFlujo; onChange: (h: HallazgoFlujo) => void }) {
  return <>
    <div className="hf-grid"><Field label="Título del problema"><input maxLength={300} value={value.titulo} onChange={e => onChange({ ...value, titulo: e.target.value })} /></Field><Field label="Severidad del problema"><select value={value.severidad} onChange={e => onChange({ ...value, severidad: Number(e.target.value) as HallazgoFlujo['severidad'] })}>{['Sin problema', 'Cosmético', 'Menor', 'Mayor', 'Crítico'].map((s, i) => <option key={s} value={i}>{i} · {s}</option>)}</select></Field></div>
    <Field label="Descripción del problema"><textarea maxLength={10000} value={value.descripcion} onChange={e => onChange({ ...value, descripcion: e.target.value })} /></Field>
    <details><summary>Contexto y propuesta de mejora (opcional)</summary>
      <Field label="Pantalla / contexto observado"><input maxLength={10000} value={value.pantalla} onChange={e => onChange({ ...value, pantalla: e.target.value })} /></Field>
      <div className="hf-grid">{(['recomendacion', 'notas'] as const).map((k, i) => <Field key={k} label={['Recomendación de mejora', 'Notas del hallazgo'][i]}><textarea maxLength={10000} value={value[k]} onChange={e => onChange({ ...value, [k]: e.target.value })} /></Field>)}</div>
      <Field label="Prioridad"><select value={value.prioridad} onChange={e => onChange({ ...value, prioridad: e.target.value as HallazgoFlujo['prioridad'] })}>{['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].map(s => <option key={s}>{s}</option>)}</select></Field>
    </details>
    <details><summary>Ver o cambiar preguntas relacionadas</summary><fieldset><legend>Criterios relacionados</legend>{config.metodologia.criterios.map(c => <label key={c.id} className="hf-check"><input type="checkbox" checked={value.criterioIds.includes(c.id)} onChange={e => onChange({ ...value, criterioIds: e.target.checked ? [...value.criterioIds, c.id] : value.criterioIds.filter(id => id !== c.id) })} />{c.nombre}</label>)}</fieldset></details>
  </>;
}

export function SaveStatus({ dirty, saving, error, lastSaved, save, reloadRevision, remote }: { dirty: boolean; saving: boolean; error: string; lastSaved: string | null; save: () => Promise<void>; reloadRevision?: () => Promise<void>; remote?: unknown }) {
  const [reloadError, setReloadError] = useState('');
  return <div className="hf-actions"><button type="button" className="secondary" disabled={saving} onClick={() => void save().catch(() => {})}>Guardar cambios</button><span role="status" className="hf-status">{saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Cambios guardados'}{lastSaved && ` · Último guardado: ${new Date(lastSaved).toLocaleString()}`}</span>{error && <><p role="alert" className="hf-error">{error} El borrador se conserva. Reintenta Guardar.</p>{reloadRevision && <button type="button" className="secondary" disabled={saving} onClick={() => void reloadRevision().catch(e => setReloadError(e instanceof Error ? e.message : 'No se pudo recargar'))}>Recargar revisión conservando mi borrador</button>}</>}{reloadError && <p role="alert">{reloadError}</p>}{remote != null && <details><summary>Revisar datos guardados en servidor antes de reintentar</summary><p>Tu borrador permanece en el editor. Guardar lo aplicará a la revisión recargada.</p><pre>{JSON.stringify(remote, null, 2)}</pre></details>}</div>;
}
export function TrabajoEditor({ evaluacion, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const problemasRef = useRef<HTMLDetailsElement>(null);
  const [hallazgoAbierto, setHallazgoAbierto] = useState<string | null>(null);
  const [mostrarFaltantes, setMostrarFaltantes] = useState(false);
  const [indice, setIndice] = useState(0);
  const criterioActual = evaluacion.configuracion.metodologia.criterios[indice];
  const trabajo = evaluacion.trabajos.find(t => t.evaluadorId === usuarioId);
  const [evidencePending, setEvidencePending] = useState<Record<string, boolean>>({});
  const pending = Object.values(evidencePending).some(Boolean);
  const state = useFlujoDraft(evaluacion, usuarioId, 'trabajo', { respuestas: trabajo?.respuestas ?? [], hallazgos: trabajo?.hallazgos ?? [] }, onSaved, pending);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const editable = evaluacion.fase === 'EN_EVALUACION' && !!trabajo && !trabajo.entregadoEn;
  const update = (h: HallazgoFlujo) => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.map(x => x.id === h.id ? h : x) });
  const faltantes = mostrarFaltantes ? pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, state.draft.hallazgos) : [];
  function agregarHallazgo(criterioId: string) {
    const h = hallazgoVacio(criterioId);
    state.setDraft({ ...state.draft, hallazgos: [...state.draft.hallazgos, h] });
    setHallazgoAbierto(h.id); if (problemasRef.current) problemasRef.current.open = true;
  }
  function irAPendiente() {
    const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => !criterioRespondido(evaluacion.configuracion, c, state.draft.respuestas.find(r => r.criterioId === c.id)));
    if (i >= 0) setIndice(i);
    else {
      const h = state.draft.hallazgos.find(h => !h.titulo.trim() || !h.descripcion.trim() || !h.criterioIds.length);
      if (h) { const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => h.criterioIds.includes(c.id)); setIndice(Math.max(0, i)); setHallazgoAbierto(h.id); if (problemasRef.current) problemasRef.current.open = true; }
    }
  }
  return <>
    <button type="button" className="secondary" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>← Evaluaciones</button>
    <section className="panel hf-espacio"><div className="page-head"><div><h2>{evaluacion.configuracion.nombre}</h2><p>{editable ? 'Responde una pregunta, anota los problemas que encuentres y continúa con la siguiente. Solo tú ves tu trabajo en esta etapa.' : trabajo?.entregadoEn ? 'Trabajo entregado. Tus respuestas están cerradas.' : 'Esperando la entrega de los expertos. Sus trabajos permanecen independientes.'}</p></div><span className="badge">{trabajo?.entregadoEn ? 'Entregada' : 'En revisión'}</span></div>
    <details className="panel"><summary>Ver avance del equipo</summary><ul>{evaluacion.avanceEquipo?.map(t => <li key={t.evaluadorId}>{t.nombre}: {t.evaluados}/{t.total} criterios completos · {t.entregadoEn ? 'Entregado' : 'En evaluación'}{t.guardadoEn && ` · Guardado ${new Date(t.guardadoEn).toLocaleString()}`}</li>)}</ul><button type="button" className="secondary" disabled={state.saving || pending} onClick={async () => { if (!(await state.confirmLeave())) return; try { await state.reloadRevision(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); } }}>Actualizar estado del equipo</button></details>
    {!trabajo && <p role="status">No estás asignado como experto. El consolidado estará disponible cuando termine el consenso.</p>}
    {trabajo && <>
      <NavegadorPreguntas config={evaluacion.configuracion} respuestas={state.draft.respuestas} indice={indice} onChange={setIndice} />
      <div className="hf-contenido"><fieldset disabled={!editable || busy}><legend>Responde esta pregunta</legend>{esChecklist(evaluacion.configuracion) ? <ChecklistView criterioVisibleId={criterioActual?.id} config={evaluacion.configuracion} respuestas={state.draft.respuestas} hallazgos={state.draft.hallazgos} editable={editable} onChange={r => state.setDraft({ ...state.draft, respuestas: [...state.draft.respuestas.filter(x => x.criterioId !== r.criterioId), r] })} onAddHallazgo={agregarHallazgo} /> : evaluacion.configuracion.metodologia.criterios.map(c => {
        const r = state.draft.respuestas.find(r => r.criterioId === c.id) ?? respuestaVacia(c.id);
        return <fieldset key={c.id} hidden={c.id !== criterioActual?.id}><legend>{c.nombre}</legend><p>{c.descripcion}</p><details><summary>Ver de dónde viene esta pregunta</summary><p className="hf-origin">{c.origen.autor} · {c.origen.version}</p></details>
          <ValoracionEditor config={evaluacion.configuracion} respuesta={r} onChange={r => state.setDraft({ ...state.draft, respuestas: [...state.draft.respuestas.filter(x => x.criterioId !== c.id), r] })} />
          <p>{state.draft.hallazgos.filter(h => h.criterioIds.includes(c.id)).length} hallazgos propios en este criterio. No registrar problemas no equivale a no aplica.</p>
          {editable && <button type="button" className="secondary" onClick={() => agregarHallazgo(c.id)}>Agregar hallazgo para {c.nombre}</button>}
        </fieldset>;
      })}</fieldset>
      <details ref={problemasRef} className="hf-problemas"><summary>Problemas encontrados · {state.draft.hallazgos.filter(h => !h.criterioIds.length || h.criterioIds.includes(criterioActual?.id ?? '')).length}</summary>{state.draft.hallazgos.map((h, i) => <details key={h.id} name={`hallazgos-${evaluacion.id}`} hidden={h.criterioIds.length > 0 && !h.criterioIds.includes(criterioActual?.id ?? '')} open={h.id === hallazgoAbierto} onToggle={e => { const abierto = e.currentTarget.open; setHallazgoAbierto(actual => abierto ? h.id : actual === h.id ? null : actual); }}><summary>{h.titulo || `Problema ${i + 1} sin título`}</summary><fieldset><legend>Hallazgo {i + 1}: {h.titulo || 'Sin título'}</legend><fieldset disabled={!editable || busy}><legend>Datos del problema</legend><HallazgoEditor value={h} config={evaluacion.configuracion} onChange={update} /></fieldset>
        <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={editable && !busy} onChange={ids => state.setDraft(prev => ({ ...prev, hallazgos: prev.hallazgos.map(x => x.id === h.id ? { ...x, evidenciaIds: ids } : x) }))} onPendingChange={value => setEvidencePending(prev => prev[h.id] === value ? prev : { ...prev, [h.id]: value })} />
        {editable && <button type="button" className="secondary" disabled={!!evidencePending[h.id] || busy} onClick={() => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.filter(x => x.id !== h.id) })}>Quitar hallazgo {i + 1}</button>}
      </fieldset></details>)}</details></div>
      <div className="hf-resumen-compacto" aria-label="Resumen de mi revisión"><span>{state.draft.respuestas.filter(r => r.noAplica && r.valor === null).length} no aplican</span><span>{state.draft.hallazgos.length} problemas registrados</span></div>
      {editable && <><SaveStatus {...state} /><button type="button" className="primary" disabled={state.saving || pending || busy} onClick={async () => {
        setError(''); setMostrarFaltantes(true); const errores = pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, state.draft.hallazgos);
        if (errores.length) { irAPendiente(); return; }
        setMostrarFaltantes(false);
        setBusy(true); try { await state.save(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/entregar`, 'POST', { revision: state.getRevision() })); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo entregar'); } finally { setBusy(false); }
      }}>Entregar mi evaluación</button>{pending && <p role="status">Guarda las anotaciones y espera las capturas antes de entregar.</p>}</>}
      {faltantes.length > 0 && <div role="alert" className="hf-error"><strong>Antes de entregar, revisa este pendiente:</strong><p>{faltantes[0]}</p><button type="button" className="secondary" onClick={irAPendiente}>Revisar pendiente</button></div>}
      {error && <p role="alert" className="hf-error">{error}</p>}
    </>}
    </section>
  </>;
}
