import { useState } from 'react';
import type { ConfiguracionFlujo, EvaluacionFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { Field } from './ConfiguracionEditor';
import { EvidenciaEditor } from './EvidenciaEditor';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import { hallazgoVacio, pendientesTrabajo, respuestaVacia } from './flujo-utils';

export function ValoracionEditor({ config, respuesta, onChange }: { config: ConfiguracionFlujo; respuesta: RespuestaCriterio; onChange: (r: RespuestaCriterio) => void }) {
  return <><Field label="Valoración"><select value={respuesta.noAplica ? 'NA' : respuesta.valor ?? ''} onChange={e => onChange({ ...respuesta, valor: e.target.value === 'NA' || !e.target.value ? null : e.target.value, noAplica: e.target.value === 'NA' })}><option value="">Sin evaluar</option>{config.metodologia.escala.niveles.map(n => <option key={n.id} value={n.id}>{n.etiqueta} — {n.significado}</option>)}<option value="NA">No aplica (requiere motivo)</option></select></Field>
    {respuesta.noAplica && <Field label="Motivo de no aplica"><textarea value={respuesta.motivo} onChange={e => onChange({ ...respuesta, motivo: e.target.value })} /></Field>}
    <Field label="Notas de la valoración"><textarea value={respuesta.notas} onChange={e => onChange({ ...respuesta, notas: e.target.value })} /></Field></>;
}
export function HallazgoEditor({ value, config, onChange }: { value: HallazgoFlujo; config: ConfiguracionFlujo; onChange: (h: HallazgoFlujo) => void }) {
  return <>
    <div className="hf-grid">{(['titulo', 'pantalla'] as const).map((k, i) => <Field key={k} label={['Título del problema', 'Pantalla / contexto observado'][i]}><input maxLength={k === 'titulo' ? 300 : 10000} value={value[k]} onChange={e => onChange({ ...value, [k]: e.target.value })} /></Field>)}</div>
    <div className="hf-grid">{(['descripcion', 'recomendacion', 'notas'] as const).map((k, i) => <Field key={k} label={['Descripción del problema', 'Recomendación de mejora', 'Notas del hallazgo'][i]}><textarea maxLength={10000} value={value[k]} onChange={e => onChange({ ...value, [k]: e.target.value })} /></Field>)}</div>
    <div className="hf-grid"><Field label="Severidad del problema"><select value={value.severidad} onChange={e => onChange({ ...value, severidad: Number(e.target.value) as HallazgoFlujo['severidad'] })}>{['Sin problema', 'Cosmético', 'Menor', 'Mayor', 'Catastrófico'].map((s, i) => <option key={s} value={i}>{i} · {s}</option>)}</select></Field><Field label="Prioridad"><select value={value.prioridad} onChange={e => onChange({ ...value, prioridad: e.target.value as HallazgoFlujo['prioridad'] })}>{['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].map(s => <option key={s}>{s}</option>)}</select></Field></div>
    <fieldset><legend>Criterios relacionados</legend>{config.metodologia.criterios.map(c => <label key={c.id} className="hf-check"><input type="checkbox" checked={value.criterioIds.includes(c.id)} onChange={e => onChange({ ...value, criterioIds: e.target.checked ? [...value.criterioIds, c.id] : value.criterioIds.filter(id => id !== c.id) })} />{c.nombre}</label>)}</fieldset>
  </>;
}
export function SaveStatus({ dirty, saving, error, lastSaved, save, reloadRevision, remote }: { dirty: boolean; saving: boolean; error: string; lastSaved: string | null; save: () => Promise<void>; reloadRevision?: () => Promise<void>; remote?: unknown }) {
  const [reloadError, setReloadError] = useState('');
  return <div className="hf-actions"><button type="button" disabled={saving} onClick={() => void save().catch(() => {})}>Guardar cambios</button><span role="status" className="hf-status">{saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Cambios guardados'}{lastSaved && ` · Último guardado: ${new Date(lastSaved).toLocaleString()}`}</span>{error && <><p role="alert" className="hf-error">{error} El borrador se conserva. Reintenta Guardar.</p>{reloadRevision && <button type="button" disabled={saving} onClick={() => void reloadRevision().catch(e => setReloadError(e instanceof Error ? e.message : 'No se pudo recargar'))}>Recargar revisión conservando mi borrador</button>}</>}{reloadError && <p role="alert">{reloadError}</p>}{remote != null && <details><summary>Revisar datos guardados en servidor antes de reintentar</summary><p>Tu borrador permanece en el editor. Guardar lo aplicará a la revisión recargada.</p><pre>{JSON.stringify(remote, null, 2)}</pre></details>}</div>;
}
export function TrabajoEditor({ evaluacion, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const trabajo = evaluacion.trabajos.find(t => t.evaluadorId === usuarioId);
  const [evidencePending, setEvidencePending] = useState<Record<string, boolean>>({});
  const pending = Object.values(evidencePending).some(Boolean);
  const state = useFlujoDraft(evaluacion, usuarioId, 'trabajo', { respuestas: trabajo?.respuestas ?? [], hallazgos: trabajo?.hallazgos ?? [] }, onSaved, pending);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const editable = evaluacion.fase === 'EN_EVALUACION' && !!trabajo && !trabajo.entregadoEn;
  const update = (h: HallazgoFlujo) => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.map(x => x.id === h.id ? h : x) });
  return <>
    <button type="button" className="text-button" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>← Evaluaciones</button>
    <div className="page-head"><div><h2>{evaluacion.configuracion.nombre}</h2><p>{editable ? 'Trabajo individual: solo tú puedes ver tus respuestas y hallazgos durante esta etapa.' : trabajo?.entregadoEn ? 'Trabajo entregado. Tus respuestas están cerradas.' : 'Esperando la entrega de los expertos. Sus trabajos permanecen independientes.'}</p></div><span className="badge">{evaluacion.fase}</span></div>
    <section className="panel"><div className="panel-head"><h2>Progreso del equipo</h2></div><ul>{evaluacion.avanceEquipo?.map(t => <li key={t.evaluadorId}>{t.nombre}: {t.evaluados}/{t.total} criterios completos · {t.entregadoEn ? 'Entregado' : 'En evaluación'}{t.guardadoEn && ` · Guardado ${new Date(t.guardadoEn).toLocaleString()}`}</li>)}</ul><button type="button" disabled={state.saving || pending} onClick={async () => { if (!(await state.confirmLeave())) return; try { await state.reloadRevision(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); } }}>Actualizar estado del equipo</button></section>
    {!trabajo && <p role="status">No estás asignado como experto. El consolidado estará disponible cuando termine el consenso.</p>}
    {trabajo && <>
      {editable && <SaveStatus {...state} />}
      <fieldset disabled={!editable || busy}><legend>Valoraciones individuales</legend>{evaluacion.configuracion.metodologia.criterios.map(c => {
        const r = state.draft.respuestas.find(r => r.criterioId === c.id) ?? respuestaVacia(c.id);
        return <fieldset key={c.id}><legend>{c.nombre}</legend><p>{c.descripcion}</p><p className="hf-origin">{c.origen.autor} · {c.origen.version}</p>
          <ValoracionEditor config={evaluacion.configuracion} respuesta={r} onChange={r => state.setDraft({ ...state.draft, respuestas: [...state.draft.respuestas.filter(x => x.criterioId !== c.id), r] })} />
          <p>{state.draft.hallazgos.filter(h => h.criterioIds.includes(c.id)).length} hallazgos propios en este criterio. No registrar problemas no equivale a no aplica.</p>
          {editable && <button type="button" onClick={() => state.setDraft({ ...state.draft, hallazgos: [...state.draft.hallazgos, hallazgoVacio(c.id)] })}>Agregar hallazgo para {c.nombre}</button>}
        </fieldset>;
      })}</fieldset>
      <section className="panel"><div className="panel-head"><h2>Mis hallazgos</h2></div>{state.draft.hallazgos.map((h, i) => <fieldset key={h.id}><legend>Hallazgo {i + 1}: {h.titulo || 'Sin título'}</legend><fieldset disabled={!editable || busy}><legend>Datos del problema</legend><HallazgoEditor value={h} config={evaluacion.configuracion} onChange={update} /></fieldset>
        <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={editable && !busy} onChange={ids => state.setDraft(prev => ({ ...prev, hallazgos: prev.hallazgos.map(x => x.id === h.id ? { ...x, evidenciaIds: ids } : x) }))} onPendingChange={value => setEvidencePending(prev => prev[h.id] === value ? prev : { ...prev, [h.id]: value })} />
        {editable && <button type="button" disabled={!!evidencePending[h.id] || busy} onClick={() => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.filter(x => x.id !== h.id) })}>Quitar hallazgo {i + 1}</button>}
      </fieldset>)}</section>
      {editable && <><SaveStatus {...state} /><button type="button" className="primary" disabled={state.saving || pending || busy} onClick={async () => {
        setError(''); const errores = pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, state.draft.hallazgos);
        if (errores.length) { setError(errores.join('\n')); return; }
        setBusy(true); try { await state.save(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/entregar`, 'POST', { revision: state.getRevision() })); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo entregar'); } finally { setBusy(false); }
      }}>Entregar mi evaluación</button>{pending && <p role="status">Guarda las anotaciones y espera las capturas antes de entregar.</p>}</>}
      {error && <p role="alert" className="hf-error">{error}</p>}
    </>}
  </>;
}
