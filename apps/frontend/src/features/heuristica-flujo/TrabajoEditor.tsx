import { useEffect, useState } from 'react';
import type { ConfiguracionFlujo, EvaluacionFlujo, HallazgoFlujo, TrabajoFlujo } from '@observatorio-ux/shared-types';
import { AnilloAvance } from '../../shared/components/AnilloAvance';
import { Field } from './campos';
import { NavegadorPreguntas } from './NavegadorPreguntas';
import { MatrizItem, agruparPorItem, esUnaTabla } from './MatrizItem';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import { notify } from '../../shared/api/toast';
import { useConfirm } from '../../shared/api/confirm';
import { compararTrabajo, criterioRespondido, guardarSesion, leerSesion, pendientesTrabajo } from './flujo-utils';
import type { ComparacionTrabajo } from './flujo-utils';

/** `conCriterios`: el selector de preguntas relacionadas solo se muestra en el trabajo individual; al preparar el informe no se ofrece. */
export function HallazgoEditor({ value, config, onChange, conCriterios = true }: { value: HallazgoFlujo; config: ConfiguracionFlujo; onChange: (h: HallazgoFlujo) => void; conCriterios?: boolean }) {
  return <>
    <div className="hf-grid"><Field label="Título del problema"><input maxLength={300} value={value.titulo} onChange={e => onChange({ ...value, titulo: e.target.value })} /></Field><Field label="Severidad del problema"><select value={value.severidad} onChange={e => onChange({ ...value, severidad: Number(e.target.value) as HallazgoFlujo['severidad'] })}>{['Sin problema', 'Cosmético', 'Menor', 'Mayor', 'Crítico'].map((s, i) => <option key={s} value={i}>{i} · {s}</option>)}</select></Field></div>
    <Field label="Descripción del problema"><textarea maxLength={10000} value={value.descripcion} onChange={e => onChange({ ...value, descripcion: e.target.value })} /></Field>
    <details><summary>Contexto y propuesta de mejora (opcional)</summary>
      <Field label="Pantalla / contexto observado"><input maxLength={10000} value={value.pantalla} onChange={e => onChange({ ...value, pantalla: e.target.value })} /></Field>
      <div className="hf-grid">{(['recomendacion', 'notas'] as const).map((k, i) => <Field key={k} label={['Recomendación de mejora', 'Notas del problema'][i]}><textarea maxLength={10000} value={value[k]} onChange={e => onChange({ ...value, [k]: e.target.value })} /></Field>)}</div>
      <Field label="Prioridad"><select value={value.prioridad} onChange={e => onChange({ ...value, prioridad: e.target.value as HallazgoFlujo['prioridad'] })}>{['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].map(s => <option key={s}>{s}</option>)}</select></Field>
    </details>
    {conCriterios && <details><summary>Ver o cambiar preguntas relacionadas</summary><fieldset><legend>Criterios relacionados</legend>{config.metodologia.criterios.map(c => <label key={c.id} className="hf-check"><input type="checkbox" checked={value.criterioIds.includes(c.id)} onChange={e => onChange({ ...value, criterioIds: e.target.checked ? [...value.criterioIds, c.id] : value.criterioIds.filter(id => id !== c.id) })} />{c.nombre}</label>)}</fieldset></details>}
  </>;
}

export function SaveStatus({ dirty, saving, error, conflict = false, lastSaved, save, reloadRevision, comparacion }: { dirty: boolean; saving: boolean; error: string; conflict?: boolean; lastSaved: string | null; save: () => Promise<void>; reloadRevision?: () => Promise<void>; comparacion?: ComparacionTrabajo }) {
  const [reloadError, setReloadError] = useState('');
  return <div className="hf-actions"><button type="button" className="ghost" disabled={saving} onClick={() => void save().catch(() => {})}>Guardar cambios</button><span role="status" className="hf-status">{saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Cambios guardados'}{lastSaved && ` · Último guardado: ${new Date(lastSaved).toLocaleString()}`}</span>{error && <><p role="alert" className="hf-error">{conflict ? 'Otra persona guardó cambios antes que tú. Tu borrador sigue aquí: recarga para continuar sin perder lo que escribiste.' : `${error} El borrador se conserva. Reintenta Guardar.`}</p>{reloadRevision && conflict && <button type="button" className={conflict ? 'primary' : 'secondary'} disabled={saving} onClick={() => { setReloadError(''); void reloadRevision().catch(e => setReloadError(e instanceof Error ? e.message : 'No se pudo recargar')); }}>Recargar revisión conservando mi borrador</button>}</>}{reloadError && <p role="alert">{reloadError}</p>}{comparacion && <details open><summary>Revisar qué hay guardado en el servidor antes de reintentar</summary><p>Guardado por {comparacion.guardadoPor} el {comparacion.guardadoEn}. Tu borrador permanece en el editor. Guardar lo aplicará a la revisión recargada.</p>{comparacion.cambios.length ? <ul>{comparacion.cambios.map(t => <li key={t}>{t}</li>)}</ul> : <p>No hay diferencias con tu borrador.</p>}</details>}</div>;
}
export function TrabajoEditor({ evaluacion, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const [mostrarFaltantes, setMostrarFaltantes] = useState(false);
  const claveIndice = `heuristica:preg:${evaluacion.id}:${usuarioId}`;
  const totalPreguntas = evaluacion.configuracion.metodologia.criterios.length;
  const [indice, setIndiceInterno] = useState(() => { const n = Number(leerSesion(claveIndice)); return Number.isInteger(n) && n >= 0 && n < totalPreguntas ? n : 0; });
  const setIndice = (i: number) => { setIndiceInterno(i); guardarSesion(claveIndice, String(i)); };
  const [verEquipo, setVerEquipo] = useState(false);
  const irAIndice = (i: number) => { if (!pending) setIndice(i); };
  const criterioActual = evaluacion.configuracion.metodologia.criterios[indice];
  const confirmar = useConfirm();
  /** Al avanzar con preguntas sin responder se pregunta si volver ahora o seguir (el diálogo toma el foco). */
  const confirmarAvance = (mensaje: string) => confirmar(mensaje, { confirmLabel: 'Volver ahora', cancelLabel: 'Seguir y volver después' });
  const [enfoque, setEnfoque] = useState<{ criterioId: string; marca: number } | undefined>();
  const [llevadoA, setLlevadoA] = useState('');
  const [visitadas, setVisitadas] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => { const cat = criterioActual?.categoria; if (cat) setVisitadas(prev => prev.has(cat) ? prev : new Set(prev).add(cat)); }, [criterioActual?.categoria]);
  const gruposTrabajo = agruparPorItem(evaluacion.configuracion, evaluacion.configuracion.metodologia.criterios);
  /** La entrega solo se ofrece en la última sección (o siempre, si la metodología no tiene secciones). */
  const enUltimaSeccion = gruposTrabajo.length <= 1 || esUnaTabla(gruposTrabajo) || gruposTrabajo[gruposTrabajo.length - 1].criterios.some(c => c.id === criterioActual?.id);
  const trabajo = evaluacion.trabajos.find(t => t.evaluadorId === usuarioId);
  const [evidencePending, setEvidencePending] = useState<Record<string, boolean>>({});
  const pending = Object.values(evidencePending).some(Boolean);
  const state = useFlujoDraft(evaluacion, usuarioId, 'trabajo', { respuestas: trabajo?.respuestas ?? [], hallazgos: trabajo?.hallazgos ?? [] }, onSaved, pending);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const editable = evaluacion.fase === 'EN_EVALUACION' && !!trabajo && !trabajo.entregadoEn;
  // F31 (D2): la evaluación individual ya no registra problemas; los que ya existían se conservan y pasan al acuerdo.
  const faltantes = mostrarFaltantes ? pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, []) : [];
  const faltanEntregar = (evaluacion.avanceEquipo ?? []).filter(t => !t.entregadoEn).map(t => t.nombre);
  const listoParaEntregar = pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, []).length === 0;
  const completos = evaluacion.configuracion.metodologia.criterios.filter(c => criterioRespondido(evaluacion.configuracion, c, state.draft.respuestas.find(r => r.criterioId === c.id))).length;
  function irAPendiente() {
    setVerEquipo(false);
    const criterios = evaluacion.configuracion.metodologia.criterios;
    const i = criterios.findIndex(c => !criterioRespondido(evaluacion.configuracion, c, state.draft.respuestas.find(r => r.criterioId === c.id)));
    if (i >= 0) { setIndice(i); setEnfoque({ criterioId: criterios[i].id, marca: Date.now() }); setLlevadoA(`Te llevé a: ${criterios[i].nombre}`); }
  }
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
      <div className="hf-revision-distribucion"><NavegadorPreguntas config={evaluacion.configuracion} respuestas={state.draft.respuestas} indice={indice} onChange={irAIndice} visitadas={visitadas}><div className="hf-resumen-compacto" aria-label="Resumen de mi revisión"><span>{state.draft.respuestas.filter(r => r.noAplica && r.valor === null).length} no aplican</span></div></NavegadorPreguntas>
      <div className="hf-contenido">
        <fieldset disabled={busy}><legend className="sr-only">Responde las preguntas</legend><MatrizItem criterios={evaluacion.configuracion.metodologia.criterios} config={evaluacion.configuracion} respuestas={state.draft.respuestas} modo="individual" editable={editable} guardado={{ dirty: state.dirty, saving: state.saving, error: state.error }} foco={criterioActual?.id} onFoco={id => { const i = evaluacion.configuracion.metodologia.criterios.findIndex(c => c.id === id); if (i >= 0) setIndice(i); }} bloqueado={pending} enfocar={enfoque} confirmarAvance={confirmarAvance} proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} onEvidencePending={(id, v) => setEvidencePending(p => ({ ...p, [`valoracion:${id}`]: v }))} onChange={r => state.setDraft({ ...state.draft, respuestas: [...state.draft.respuestas.filter(x => x.criterioId !== r.criterioId), r] })} /></fieldset>
      </div></div>
      <footer className="hf-pie-trabajo">
      {editable && <><SaveStatus {...state} comparacion={state.remote ? compararTrabajo(evaluacion.configuracion, state.remote as TrabajoFlujo, state.draft) : undefined} />{enUltimaSeccion && <button type="button" className={listoParaEntregar ? 'primary' : 'secondary'} disabled={state.saving || pending || busy} onClick={async () => {
        setError(''); setMostrarFaltantes(true); const errores = pendientesTrabajo(evaluacion.configuracion, state.draft.respuestas, []);
        if (errores.length) { irAPendiente(); return; }
        setMostrarFaltantes(false);
        setBusy(true); try { await state.save(); const r = await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/entregar`, 'POST', { revision: state.getRevision() }); onSaved(r); notify.success(r.fase === 'PENDIENTE_CONSENSO' ? 'Entregaste tu evaluación. Ya entregaron todas las personas: ahora el equipo acuerda el resultado.' : 'Entregaste tu evaluación. Tus respuestas quedaron cerradas; falta que entregue el resto del equipo.'); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo entregar'); } finally { setBusy(false); }
      }}>Entregar mi evaluación</button>}{enUltimaSeccion && listoParaEntregar && !pending && <p role="status">Estás listo para entregar</p>}{pending && <p role="status">Guarda las anotaciones y espera las capturas antes de entregar o cambiar de pregunta.</p>}</>}
      {faltantes.length > 0 && <div role="alert" className="hf-error"><strong>Antes de entregar, revisa este pendiente:</strong><p>{faltantes[0]}</p><button type="button" className="secondary" onClick={irAPendiente}>Revisar pendiente</button></div>}
      <p role="status" className="hf-llevado">{llevadoA}</p>
      </footer>
    </div>}
    {error && <p role="alert" className="hf-error">{error}</p>}
    </section>
  </>;
}
