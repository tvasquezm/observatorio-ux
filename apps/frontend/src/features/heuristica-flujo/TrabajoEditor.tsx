import { useId, useState } from 'react';
import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo, HallazgoFlujo, RespuestaCriterio, TrabajoFlujo } from '@observatorio-ux/shared-types';
import { AnilloAvance } from '../../shared/components/AnilloAvance';
import { Field } from './campos';
import { NavegadorPreguntas } from './NavegadorPreguntas';
import { EvidenciaEditor } from './EvidenciaEditor';
import { MatrizItem } from './MatrizItem';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import { notify } from '../../shared/api/toast';
import { compararTrabajo, criterioRespondido, guardarSesion, hallazgoVacio, leerSesion, pendientesTrabajo } from './flujo-utils';
import type { ComparacionTrabajo } from './flujo-utils';

export function ValoracionEditor({ config, respuesta, onChange }: { config: ConfiguracionFlujo; respuesta: RespuestaCriterio; onChange: (r: RespuestaCriterio) => void }) {
  const criterio = config.metodologia.criterios.find(c => c.id === respuesta.criterioId);
  const niveles = (criterio ? escalaDe(config.metodologia, criterio) : config.metodologia.escala).niveles;
  const id = useId();
  return <><div className="hf-opciones" role="radiogroup" aria-label="Valoración">
    {niveles.map(n => <label key={n.id} className="hf-opcion"><input type="radio" name={id} aria-label={n.etiqueta} aria-describedby={`${id}-${n.id}`} checked={!respuesta.noAplica && respuesta.valor === n.id} onChange={() => onChange({ ...respuesta, noAplica: false, valor: n.id })} /><span><strong>{n.etiqueta}</strong><small id={`${id}-${n.id}`}>{n.significado}</small></span></label>)}
    <label className="hf-opcion"><input type="radio" name={id} aria-label="No aplica" checked={respuesta.noAplica} onChange={() => onChange({ ...respuesta, noAplica: true, valor: null })} /><span><strong>No aplica</strong><small>Esta pregunta no corresponde al producto.</small></span></label>
    </div><details><summary>Agregar notas (opcional)</summary><Field label="Notas de la valoración"><textarea maxLength={10000} value={respuesta.notas} onChange={e => onChange({ ...respuesta, notas: e.target.value })} /></Field>{respuesta.motivo && <p className="hf-ayuda">Nota anterior: {respuesta.motivo}</p>}</details></>;
}

export function HallazgoEditor({ value, config, onChange }: { value: HallazgoFlujo; config: ConfiguracionFlujo; onChange: (h: HallazgoFlujo) => void }) {
  return <>
    <div className="hf-grid"><Field label="Título del problema"><input maxLength={300} value={value.titulo} onChange={e => onChange({ ...value, titulo: e.target.value })} /></Field><Field label="Severidad del problema"><select value={value.severidad} onChange={e => onChange({ ...value, severidad: Number(e.target.value) as HallazgoFlujo['severidad'] })}>{['Sin problema', 'Cosmético', 'Menor', 'Mayor', 'Crítico'].map((s, i) => <option key={s} value={i}>{i} · {s}</option>)}</select></Field></div>
    <Field label="Descripción del problema"><textarea maxLength={10000} value={value.descripcion} onChange={e => onChange({ ...value, descripcion: e.target.value })} /></Field>
    <details><summary>Contexto y propuesta de mejora (opcional)</summary>
      <Field label="Pantalla / contexto observado"><input maxLength={10000} value={value.pantalla} onChange={e => onChange({ ...value, pantalla: e.target.value })} /></Field>
      <div className="hf-grid">{(['recomendacion', 'notas'] as const).map((k, i) => <Field key={k} label={['Recomendación de mejora', 'Notas del problema'][i]}><textarea maxLength={10000} value={value[k]} onChange={e => onChange({ ...value, [k]: e.target.value })} /></Field>)}</div>
      <Field label="Prioridad"><select value={value.prioridad} onChange={e => onChange({ ...value, prioridad: e.target.value as HallazgoFlujo['prioridad'] })}>{['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].map(s => <option key={s}>{s}</option>)}</select></Field>
    </details>
    <details><summary>Ver o cambiar preguntas relacionadas</summary><fieldset><legend>Criterios relacionados</legend>{config.metodologia.criterios.map(c => <label key={c.id} className="hf-check"><input type="checkbox" checked={value.criterioIds.includes(c.id)} onChange={e => onChange({ ...value, criterioIds: e.target.checked ? [...value.criterioIds, c.id] : value.criterioIds.filter(id => id !== c.id) })} />{c.nombre}</label>)}</fieldset></details>
  </>;
}

export function SaveStatus({ dirty, saving, error, conflict = false, lastSaved, save, reloadRevision, comparacion }: { dirty: boolean; saving: boolean; error: string; conflict?: boolean; lastSaved: string | null; save: () => Promise<void>; reloadRevision?: () => Promise<void>; comparacion?: ComparacionTrabajo }) {
  const [reloadError, setReloadError] = useState('');
  return <div className="hf-actions"><button type="button" className="ghost" disabled={saving} onClick={() => void save().catch(() => {})}>Guardar cambios</button><span role="status" className="hf-status">{saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Cambios guardados'}{lastSaved && ` · Último guardado: ${new Date(lastSaved).toLocaleString()}`}</span>{error && <><p role="alert" className="hf-error">{conflict ? 'Otra persona guardó cambios antes que tú. Tu borrador sigue aquí: recarga para continuar sin perder lo que escribiste.' : `${error} El borrador se conserva. Reintenta Guardar.`}</p>{reloadRevision && conflict && <button type="button" className={conflict ? 'primary' : 'secondary'} disabled={saving} onClick={() => { setReloadError(''); void reloadRevision().catch(e => setReloadError(e instanceof Error ? e.message : 'No se pudo recargar')); }}>Recargar revisión conservando mi borrador</button>}</>}{reloadError && <p role="alert">{reloadError}</p>}{comparacion && <details open><summary>Revisar qué hay guardado en el servidor antes de reintentar</summary><p>Guardado por {comparacion.guardadoPor} el {comparacion.guardadoEn}. Tu borrador permanece en el editor. Guardar lo aplicará a la revisión recargada.</p>{comparacion.cambios.length ? <ul>{comparacion.cambios.map(t => <li key={t}>{t}</li>)}</ul> : <p>No hay diferencias con tu borrador.</p>}</details>}</div>;
}
export function TrabajoEditor({ evaluacion, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const [problemasAbiertos, setProblemasAbiertos] = useState<ReadonlySet<string>>(new Set());
  const [mostrarFaltantes, setMostrarFaltantes] = useState(false);
  const [colapsados, setColapsados] = useState<ReadonlySet<string>>(new Set());
  const [errorProblema, setErrorProblema] = useState<Record<string, string>>({});
  const claveIndice = `heuristica:preg:${evaluacion.id}:${usuarioId}`;
  const totalPreguntas = evaluacion.configuracion.metodologia.criterios.length;
  const [indice, setIndiceInterno] = useState(() => { const n = Number(leerSesion(claveIndice)); return Number.isInteger(n) && n >= 0 && n < totalPreguntas ? n : 0; });
  const setIndice = (i: number) => { setIndiceInterno(i); guardarSesion(claveIndice, String(i)); };
  const [verEquipo, setVerEquipo] = useState(false);
  const irAIndice = (i: number) => { if (!pending) setIndice(i); };
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
  const faltanEntregar = (evaluacion.avanceEquipo ?? []).filter(t => !t.entregadoEn).map(t => t.nombre);
  const listoParaEntregar = pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, state.draft.hallazgos).length === 0;
  const abrirProblemas = (criterioId: string) => setProblemasAbiertos(prev => new Set(prev).add(criterioId));
  const alternarProblemas = (criterioId: string) => {
    if (problemasAbiertos.has(criterioId) && state.draft.hallazgos.some(h => h.criterioIds[0] === criterioId && evidencePending[h.id])) return;
    setProblemasAbiertos(prev => { const n = new Set(prev); if (n.has(criterioId)) n.delete(criterioId); else n.add(criterioId); return n; });
  };
  function agregarHallazgo(criterioId: string) {
    const h = hallazgoVacio(criterioId);
    const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => c.id === criterioId); if (i >= 0) setIndice(i);
    state.setDraft({ ...state.draft, hallazgos: [...state.draft.hallazgos, h] });
    abrirProblemas(criterioId);
  }
  const completos = evaluacion.configuracion.metodologia.criterios.filter(c => criterioRespondido(evaluacion.configuracion, c, state.draft.respuestas.find(r => r.criterioId === c.id))).length;
  function irAPendiente() {
    setVerEquipo(false);
    const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => !criterioRespondido(evaluacion.configuracion, c, state.draft.respuestas.find(r => r.criterioId === c.id)));
    if (i >= 0) setIndice(i);
    else {
      const h = state.draft.hallazgos.find(h => !h.titulo.trim() || !h.descripcion.trim() || !h.criterioIds.length);
      if (h) { const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => c.id === h.criterioIds[0]); setIndice(Math.max(0, i)); if (h.criterioIds.length) abrirProblemas(h.criterioIds[0]); }
    }
  }
  async function guardarProblema(h: HallazgoFlujo, i: number) {
    const campos = [!h.titulo.trim() && 'título', !h.descripcion.trim() && 'descripción', !h.criterioIds.length && 'pregunta relacionada'].filter(Boolean);
    if (campos.length) { setErrorProblema(prev => ({ ...prev, [h.id]: `Problema ${i + 1}: completa ${campos.join(' y ')}.` })); return; }
    try { await state.save(); } catch { setErrorProblema(prev => ({ ...prev, [h.id]: 'No se pudo guardar el problema. Tu borrador se conserva.' })); return; }
    setErrorProblema(prev => ({ ...prev, [h.id]: '' }));
    setColapsados(prev => new Set(prev).add(h.id));
  }
  const bloqueProblema = (h: HallazgoFlujo, i: number) => {
    const quitar = editable && <button type="button" className="danger" disabled={!!evidencePending[h.id] || busy} onClick={() => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.filter(x => x.id !== h.id) })}>Quitar problema {i + 1}</button>;
    if (colapsados.has(h.id)) return <fieldset key={h.id}><legend>Problema {i + 1}: {h.titulo}</legend><p>Severidad {h.severidad}</p><p role="status">Problema guardado con éxito</p>{editable && <button type="button" className="secondary" onClick={() => setColapsados(prev => { const n = new Set(prev); n.delete(h.id); return n; })}>Editar problema {i + 1}</button>}{quitar}</fieldset>;
    return <fieldset key={h.id}><legend>Problema {i + 1}: {h.titulo || 'Sin título'}</legend><fieldset disabled={!editable || busy}><legend>Datos del problema</legend><HallazgoEditor value={h} config={evaluacion.configuracion} onChange={update} /></fieldset>
        <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={editable && !busy} onChange={ids => state.setDraft(prev => ({ ...prev, hallazgos: prev.hallazgos.map(x => x.id === h.id ? { ...x, evidenciaIds: ids } : x) }))} onPendingChange={value => setEvidencePending(prev => prev[h.id] === value ? prev : { ...prev, [h.id]: value })} />
        {editable && <button type="button" className="secondary" disabled={!!evidencePending[h.id] || busy || state.saving} onClick={() => void guardarProblema(h, i)}>Guardar problema {i + 1}</button>}
        {errorProblema[h.id] && <p role="alert" className="hf-error">{errorProblema[h.id]}</p>}
        {quitar}
      </fieldset>;
  };
  const problemasDe = (criterioId: string) => state.draft.hallazgos.map((h, i) => h.criterioIds[0] === criterioId ? bloqueProblema(h, i) : null);
  const sinPregunta = state.draft.hallazgos.filter(h => !h.criterioIds.length);
  const problemas = sinPregunta.length > 0 && <details className="hf-problemas" open><summary>Problemas sin pregunta relacionada &middot; {sinPregunta.length}</summary>{state.draft.hallazgos.map((h, i) => h.criterioIds.length ? null : bloqueProblema(h, i))}</details>;
  return <>
    <button type="button" className="secondary hf-volver" onClick={async () => { if (await state.confirmLeave()) onBack(); }}><span aria-hidden="true">←</span> Volver</button>
    <section className="panel hf-espacio"><div className="page-head"><div><h2>{evaluacion.configuracion.nombre}</h2><p>{editable ? 'Califica cada pregunta en su tabla. Tu trabajo es privado.' : trabajo?.entregadoEn ? 'Trabajo entregado. Tus respuestas están cerradas.' : 'Esperando la entrega de los expertos. Sus trabajos permanecen independientes.'}</p></div><span className="badge">{trabajo?.entregadoEn ? 'Entregada' : 'En revisión'}</span></div>
    {trabajo?.entregadoEn && evaluacion.fase === 'EN_EVALUACION' && <div role="status"><strong>Entregaste tu evaluación</strong><p className="hf-ayuda">{faltanEntregar.length ? `Falta que entreguen: ${faltanEntregar.join(', ')}.` : 'Esperando a que entregue el resto del equipo.'}</p></div>}
    <nav className="hf-vistas" aria-label="Vistas de la evaluación">{trabajo && <button type="button" aria-current={!verEquipo ? 'page' : undefined} onClick={() => setVerEquipo(false)}>Mi revisión</button>}<button type="button" aria-current={verEquipo || !trabajo ? 'page' : undefined} onClick={() => setVerEquipo(true)}>Resumen del equipo</button></nav>
    <section hidden={!!trabajo && !verEquipo} className="hf-equipo-resumen" aria-label="Resumen del equipo">
      {trabajo && <div className="hf-mi-avance"><h3>Tu revisión</h3><p><strong>{completos}</strong> de {evaluacion.configuracion.metodologia.criterios.length} preguntas</p><AnilloAvance hecho={completos} total={evaluacion.configuracion.metodologia.criterios.length} etiqueta="preguntas" tamano={64} /><p>{trabajo.entregadoEn ? 'Tu revisión ya está entregada.' : 'Puedes continuar donde quedaste.'}</p></div>}
      <div><h3>Progreso del equipo</h3>{evaluacion.avanceEquipo?.map(t => <div className="hf-persona-avance" key={t.evaluadorId}><div><strong>{t.nombre}</strong><span>{t.entregadoEn ? 'Entregado' : 'En revisión'}</span></div><span>{t.evaluadorId === usuarioId ? completos : t.evaluados}/{t.total}</span><AnilloAvance hecho={t.evaluadorId === usuarioId ? completos : t.evaluados} total={t.total} etiqueta={`preguntas de ${t.nombre}`} tamano={28} /></div>)}<p className="hf-ayuda">Los trabajos individuales son privados. Aquí solo ves el avance de las otras personas.</p><button type="button" className="secondary" disabled={state.saving || pending} onClick={async () => { if (!(await state.confirmLeave())) return; try { await state.reloadRevision(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); } }}>Actualizar estado del equipo</button></div>
    </section>
    {trabajo && <div hidden={verEquipo} className="hf-trabajo-individual">
      <div className="hf-revision-distribucion"><NavegadorPreguntas config={evaluacion.configuracion} respuestas={state.draft.respuestas} indice={indice} onChange={irAIndice}><div className="hf-resumen-compacto" aria-label="Resumen de mi revisión"><span>{state.draft.respuestas.filter(r => r.noAplica && r.valor === null).length} no aplican</span><span>{state.draft.hallazgos.length === 1 ? '1 problema registrado' : `${state.draft.hallazgos.length} problemas registrados`}</span></div></NavegadorPreguntas>
      <div className="hf-contenido">
        <fieldset disabled={busy}><legend className="sr-only">Responde las preguntas</legend><MatrizItem criterios={evaluacion.configuracion.metodologia.criterios} config={evaluacion.configuracion} respuestas={state.draft.respuestas} modo="individual" editable={editable} guardado={{ dirty: state.dirty, saving: state.saving, error: state.error }} foco={criterioActual?.id} onFoco={id => { const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => c.id === id); if (i >= 0) setIndice(i); }} hallazgos={state.draft.hallazgos} onAddHallazgo={agregarHallazgo} problemasAbiertos={problemasAbiertos} onToggleProblemas={alternarProblemas} renderProblemas={problemasDe} bloqueado={pending} proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} onEvidencePending={(id, v) => setEvidencePending(p => ({ ...p, [`valoracion:${id}`]: v }))} onChange={r => state.setDraft({ ...state.draft, respuestas: [...state.draft.respuestas.filter(x => x.criterioId !== r.criterioId), r] })} /></fieldset>
        {problemas}
      </div></div>
      <footer className="hf-pie-trabajo">
      {editable && <><SaveStatus {...state} comparacion={state.remote ? compararTrabajo(evaluacion.configuracion, state.remote as TrabajoFlujo, state.draft) : undefined} /><button type="button" className={listoParaEntregar ? 'primary' : 'secondary'} disabled={state.saving || pending || busy} onClick={async () => {
        setError(''); setMostrarFaltantes(true); const errores = pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, state.draft.hallazgos);
        if (errores.length) { irAPendiente(); return; }
        setMostrarFaltantes(false);
        setBusy(true); try { await state.save(); const r = await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/entregar`, 'POST', { revision: state.getRevision() }); onSaved(r); notify.success(r.fase === 'PENDIENTE_CONSENSO' ? 'Entregaste tu evaluación. Ya entregaron todas las personas: ahora el equipo acuerda el resultado.' : 'Entregaste tu evaluación. Tus respuestas quedaron cerradas; falta que entregue el resto del equipo.'); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo entregar'); } finally { setBusy(false); }
      }}>Entregar mi evaluación</button>{listoParaEntregar && !pending && <p role="status">Estás listo para entregar</p>}{pending && <p role="status">Guarda las anotaciones y espera las capturas antes de entregar o cambiar de pregunta.</p>}</>}
      {faltantes.length > 0 && <div role="alert" className="hf-error"><strong>Antes de entregar, revisa este pendiente:</strong><p>{faltantes[0]}</p><button type="button" className="secondary" onClick={irAPendiente}>Revisar pendiente</button></div>}
      </footer>
    </div>}
    {error && <p role="alert" className="hf-error">{error}</p>}
    </section>
  </>;
}
