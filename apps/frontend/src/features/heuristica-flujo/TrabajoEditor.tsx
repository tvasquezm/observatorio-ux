import { useId, useMemo, useRef, useState } from 'react';
import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { Field } from './campos';
import { NavegadorPreguntas } from './NavegadorPreguntas';
import { EvidenciaEditor } from './EvidenciaEditor';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import { ChecklistView } from './ChecklistView';
import { TarjetaPregunta } from './TarjetaPregunta';
import { RecorridoRondas } from './RecorridoRondas';
import { ResumenRonda } from './ResumenRonda';
import { armarRondas } from './rondas';
import { criterioRespondido, esChecklist, guardarSesion, hallazgoVacio, leerSesion, pendientesTrabajo, respuestaVacia, textoProblemas } from './flujo-utils';

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

export function SaveStatus({ dirty, saving, error, lastSaved, save, reloadRevision, remote }: { dirty: boolean; saving: boolean; error: string; lastSaved: string | null; save: () => Promise<void>; reloadRevision?: () => Promise<void>; remote?: unknown }) {
  const [reloadError, setReloadError] = useState('');
  return <div className="hf-actions"><button type="button" className="ghost" disabled={saving} onClick={() => void save().catch(() => {})}>Guardar cambios</button><span role="status" className="hf-status">{saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Cambios guardados'}{lastSaved && ` · Último guardado: ${new Date(lastSaved).toLocaleString()}`}</span>{error && <><p role="alert" className="hf-error">{error} El borrador se conserva. Reintenta Guardar.</p>{reloadRevision && <button type="button" className="secondary" disabled={saving} onClick={() => void reloadRevision().catch(e => setReloadError(e instanceof Error ? e.message : 'No se pudo recargar'))}>Recargar revisión conservando mi borrador</button>}</>}{reloadError && <p role="alert">{reloadError}</p>}{remote != null && <details><summary>Revisar datos guardados en servidor antes de reintentar</summary><p>Tu borrador permanece en el editor. Guardar lo aplicará a la revisión recargada.</p><pre>{JSON.stringify(remote, null, 2)}</pre></details>}</div>;
}
export function TrabajoEditor({ evaluacion, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const problemasRef = useRef<HTMLDetailsElement>(null);
  const [hallazgoAbierto, setHallazgoAbierto] = useState<string | null>(null);
  const [mostrarFaltantes, setMostrarFaltantes] = useState(false);
  const claveIndice = `heuristica:preg:${evaluacion.id}:${usuarioId}`;
  const totalPreguntas = evaluacion.configuracion.metodologia.criterios.length;
  const [indice, setIndiceInterno] = useState(() => { const n = Number(leerSesion(claveIndice)); return Number.isInteger(n) && n >= 0 && n < totalPreguntas ? n : 0; });
  const setIndice = (i: number) => { setIndiceInterno(i); guardarSesion(claveIndice, String(i)); };
  const claveAuto = `heuristica:auto:${usuarioId}`;
  const [auto, setAutoInterno] = useState(() => leerSesion(claveAuto) !== '0');
  const setAuto = (v: boolean) => { setAutoInterno(v); guardarSesion(claveAuto, v ? '1' : '0'); };
  const [verEquipo, setVerEquipo] = useState(false);
  const [resumen, setResumen] = useState<{ ronda: number; final: boolean } | null>(null);
  const rondas = useMemo(() => armarRondas(evaluacion.configuracion.metodologia.criterios), [evaluacion.configuracion.metodologia.criterios]);
  const rondaDe = (i: number) => Math.max(0, rondas.findIndex(r => r.criterios.some(c => c.id === evaluacion.configuracion.metodologia.criterios[i]?.id)));
  const rondaActual = rondaDe(indice);
  const irAIndice = (i: number) => { setResumen(null); setIndice(i); };
  function avanzar() {
    const siguiente = indice + 1;
    if (siguiente < totalPreguntas && rondaDe(siguiente) === rondaActual) { setIndice(siguiente); return; }
    setResumen({ ronda: rondaActual, final: siguiente >= totalPreguntas && rondaActual === rondas.length - 1 });
  }
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
  const completos = evaluacion.configuracion.metodologia.criterios.filter(c => criterioRespondido(evaluacion.configuracion, c, state.draft.respuestas.find(r => r.criterioId === c.id))).length;
  function irAPendiente() {
    setVerEquipo(false); setResumen(null);
    const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => !criterioRespondido(evaluacion.configuracion, c, state.draft.respuestas.find(r => r.criterioId === c.id)));
    if (i >= 0) setIndice(i);
    else {
      const h = state.draft.hallazgos.find(h => !h.titulo.trim() || !h.descripcion.trim() || !h.criterioIds.length);
      if (h) { const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => h.criterioIds.includes(c.id)); setIndice(Math.max(0, i)); setHallazgoAbierto(h.id); if (problemasRef.current) problemasRef.current.open = true; }
    }
  }
  const resumenRonda = resumen && (() => {
    const crits = resumen.final ? evaluacion.configuracion.metodologia.criterios : rondas[resumen.ronda]?.criterios ?? [];
    const ids = new Set(crits.map(c => c.id));
    const respuesta = (id: string) => state.draft.respuestas.find(r => r.criterioId === id);
    const hechas = crits.filter(c => criterioRespondido(evaluacion.configuracion, c, respuesta(c.id)));
    const noAplican = hechas.filter(c => respuesta(c.id)?.noAplica).length;
    return <ResumenRonda numero={resumen.ronda + 1} total={rondas.length} final={resumen.final} respondidas={hechas.length - noAplican} noAplican={noAplican} problemas={state.draft.hallazgos.filter(h => resumen.final || h.criterioIds.some(id => ids.has(id))).length} pendientes={crits.length - hechas.length}
      onSeguir={() => { if (resumen.final) { irAPendiente(); return; } const sig = rondas[resumen.ronda + 1]; irAIndice(sig ? Math.max(0, evaluacion.configuracion.metodologia.criterios.findIndex(c => c.id === sig.criterios[0].id)) : indice); }} onVolver={() => setResumen(null)} />;
  })();
  const tieneProblemasAqui = state.draft.hallazgos.some(h => h.criterioIds.includes(criterioActual?.id ?? ''));
  const problemas = <details ref={problemasRef} className="hf-problemas" open={tieneProblemasAqui}><summary>Problemas encontrados &middot; {state.draft.hallazgos.filter(h => !h.criterioIds.length || h.criterioIds.includes(criterioActual?.id ?? '')).length}</summary>{state.draft.hallazgos.map((h, i) => <details key={h.id} name={`hallazgos-${evaluacion.id}`} hidden={h.criterioIds.length > 0 && !h.criterioIds.includes(criterioActual?.id ?? '')} open={h.id === hallazgoAbierto} onToggle={e => { const abierto = e.currentTarget.open; setHallazgoAbierto(actual => abierto ? h.id : actual === h.id ? null : actual); }}><summary>{h.titulo || `Problema ${i + 1} sin título`}</summary><fieldset><legend>Problema {i + 1}: {h.titulo || 'Sin título'}</legend><fieldset disabled={!editable || busy}><legend>Datos del problema</legend><HallazgoEditor value={h} config={evaluacion.configuracion} onChange={update} /></fieldset>
        <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={editable && !busy} onChange={ids => state.setDraft(prev => ({ ...prev, hallazgos: prev.hallazgos.map(x => x.id === h.id ? { ...x, evidenciaIds: ids } : x) }))} onPendingChange={value => setEvidencePending(prev => prev[h.id] === value ? prev : { ...prev, [h.id]: value })} />
        {editable && <button type="button" className="danger" disabled={!!evidencePending[h.id] || busy} onClick={() => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.filter(x => x.id !== h.id) })}>Quitar problema {i + 1}</button>}
      </fieldset></details>)}</details>;
  return <>
    <button type="button" className="secondary" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>← Evaluaciones</button>
    <section className="panel hf-espacio"><div className="page-head"><div><h2>{evaluacion.configuracion.nombre}</h2><p>{editable ? 'Responde una pregunta a la vez. Tu trabajo es privado.' : trabajo?.entregadoEn ? 'Trabajo entregado. Tus respuestas están cerradas.' : 'Esperando la entrega de los expertos. Sus trabajos permanecen independientes.'}</p></div><span className="badge">{trabajo?.entregadoEn ? 'Entregada' : 'En revisión'}</span></div>
    <nav className="hf-vistas" aria-label="Vistas de la evaluación">{trabajo && <button type="button" aria-current={!verEquipo ? 'page' : undefined} onClick={() => setVerEquipo(false)}>Mi revisión</button>}<button type="button" aria-current={verEquipo || !trabajo ? 'page' : undefined} onClick={() => setVerEquipo(true)}>Resumen del equipo</button></nav>
    <section hidden={!!trabajo && !verEquipo} className="hf-equipo-resumen" aria-label="Resumen del equipo">
      {trabajo && <div className="hf-mi-avance"><h3>Tu revisión</h3><p><strong>{completos}</strong> de {evaluacion.configuracion.metodologia.criterios.length} preguntas</p><progress max={evaluacion.configuracion.metodologia.criterios.length || 1} value={completos} aria-label="Tu avance" /><p>{trabajo.entregadoEn ? 'Tu revisión ya está entregada.' : 'Puedes continuar donde quedaste.'}</p></div>}
      <div><h3>Progreso del equipo</h3>{evaluacion.avanceEquipo?.map(t => <div className="hf-persona-avance" key={t.evaluadorId}><div><strong>{t.nombre}</strong><span>{t.entregadoEn ? 'Entregado' : 'En revisión'}</span></div><span>{t.evaluadorId === usuarioId ? completos : t.evaluados}/{t.total}</span><progress max={t.total || 1} value={t.evaluadorId === usuarioId ? completos : t.evaluados} aria-label={`Avance de ${t.nombre}`} /></div>)}<p className="hf-ayuda">Los trabajos individuales son privados. Aquí solo ves el avance de las otras personas.</p><button type="button" className="secondary" disabled={state.saving || pending} onClick={async () => { if (!(await state.confirmLeave())) return; try { await state.reloadRevision(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); } }}>Actualizar estado del equipo</button></div>
    </section>
    {trabajo && <div hidden={verEquipo} className="hf-trabajo-individual">
      <div className="hf-revision-distribucion"><NavegadorPreguntas config={evaluacion.configuracion} respuestas={state.draft.respuestas} indice={indice} onChange={irAIndice} sinBotones />
      <div className="hf-contenido">{resumen && resumenRonda}<div hidden={!!resumen}><RecorridoRondas config={evaluacion.configuracion} indice={indice} onIrA={irAIndice}><p className="hf-ayuda">Pregunta {indice + 1} de {evaluacion.configuracion.metodologia.criterios.length}</p>{esChecklist(evaluacion.configuracion) ? <fieldset disabled={!editable || busy}><legend className="sr-only">Responde esta pregunta</legend><ChecklistView criteriosVisibles={rondas[rondaActual]?.criterios.map(c => c.id)} config={evaluacion.configuracion} respuestas={state.draft.respuestas} hallazgos={state.draft.hallazgos} editable={editable} onChange={r => state.setDraft({ ...state.draft, respuestas: [...state.draft.respuestas.filter(x => x.criterioId !== r.criterioId), r] })} onAddHallazgo={agregarHallazgo} /></fieldset> : criterioActual && <TarjetaPregunta config={evaluacion.configuracion} criterio={criterioActual} numero={indice + 1} total={totalPreguntas} respuesta={state.draft.respuestas.find(r => r.criterioId === criterioActual.id) ?? respuestaVacia(criterioActual.id)} editable={editable && !busy} auto={auto} onAuto={setAuto} onChange={r => state.setDraft({ ...state.draft, respuestas: [...state.draft.respuestas.filter(x => x.criterioId !== criterioActual.id), r] })} onAvanzar={avanzar}>
        <p>{textoProblemas(state.draft.hallazgos.filter(h => h.criterioIds.includes(criterioActual.id)).length, 'esta pregunta')}</p><details><summary>Ver de dónde viene esta pregunta</summary><p className="hf-origin">{criterioActual.origen.autor} &middot; {criterioActual.origen.version}</p></details>
        {editable && <button type="button" className="secondary" disabled={busy} onClick={() => agregarHallazgo(criterioActual.id)}>Agregar problema para {criterioActual.nombre}</button>}
        {problemas}
      </TarjetaPregunta>}
      {esChecklist(evaluacion.configuracion) && problemas}</RecorridoRondas></div></div></div>
      <footer className="hf-pie-trabajo"><div className="hf-resumen-compacto" aria-label="Resumen de mi revisión"><span>{state.draft.respuestas.filter(r => r.noAplica && r.valor === null).length} no aplican</span><span>{state.draft.hallazgos.length === 1 ? '1 problema registrado' : `${state.draft.hallazgos.length} problemas registrados`}</span>{editable && <button type="button" className="ghost" onClick={() => setResumen({ ronda: rondaActual, final: true })}>Ver revisión final</button>}</div>
      <div className="hf-actions hf-navegar"><button type="button" className="secondary" disabled={indice === 0} onClick={() => setIndice(indice - 1)}>Pregunta anterior</button><button type="button" className={indice >= totalPreguntas - 1 ? 'secondary' : 'primary'} disabled={indice >= totalPreguntas - 1} onClick={avanzar}>Pregunta siguiente</button></div>
      {editable && <><SaveStatus {...state} /><button type="button" className={indice >= totalPreguntas - 1 ? 'primary' : 'secondary'} disabled={state.saving || pending || busy} onClick={async () => {
        setError(''); setMostrarFaltantes(true); const errores = pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, state.draft.hallazgos);
        if (errores.length) { irAPendiente(); return; }
        setMostrarFaltantes(false);
        setBusy(true); try { await state.save(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/entregar`, 'POST', { revision: state.getRevision() })); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo entregar'); } finally { setBusy(false); }
      }}>Entregar mi evaluación</button>{pending && <p role="status">Guarda las anotaciones y espera las capturas antes de entregar.</p>}</>}
      {faltantes.length > 0 && <div role="alert" className="hf-error"><strong>Antes de entregar, revisa este pendiente:</strong><p>{faltantes[0]}</p><button type="button" className="secondary" onClick={irAPendiente}>Revisar pendiente</button></div>}
      </footer>
    </div>}
    {error && <p role="alert" className="hf-error">{error}</p>}
    </section>
  </>;
}
