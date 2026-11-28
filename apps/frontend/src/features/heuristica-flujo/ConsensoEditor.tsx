import { useEffect, useRef, useState } from 'react';
import { RecorridoSencillo } from './RecorridoSencillo';
import { ETIQUETA_SECCION_ACUERDO, MAX_HALLAZGOS_NUEVOS_EQUIPO, mejoraVacia, origenHallazgo, pendientesAcuerdo, redactorDe } from '@observatorio-ux/shared-types';
import type { DecisionHallazgo, EvaluacionFlujo, MiembroEquipoFlujo, SeccionAcuerdo } from '@observatorio-ux/shared-types';
import { Field } from './ConfiguracionEditor';
import { EvidenciaEditor } from './EvidenciaEditor';
import { AspectosPositivos } from './AspectosPositivos';
import { MatrizItem } from './MatrizItem';
import { RedactorPanel } from './RedactorPanel';
import { AporteEquipo } from './AporteEquipo';
import { AportePositivoEquipo } from './AportePositivoEquipo';
import { HallazgoEditor, SaveStatus } from './TrabajoEditor';
import { notify } from '../../shared/api/toast';
import { flujoRequest } from './flujo.api';
import { fechaChile, hallazgoVacio, precargarConsenso, precargarDecisiones } from './flujo-utils';
import { useFlujoDraft } from './useFlujoDraft';

export function ConsensoEditor({ evaluacion, usuarioId, onSaved, onBack, equipo }: { evaluacion: EvaluacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void; equipo?: MiembroEquipoFlujo[] }) {
  const redactorId = redactorDe(evaluacion.consenso, evaluacion.coordinadorId);
  const soloLectura = usuarioId !== redactorId;
  const [subiendo, setSubiendo] = useState<Record<string, boolean>>({});
  const subiendoCapturas = Object.values(subiendo).some(Boolean);
  const state = useFlujoDraft(evaluacion, usuarioId, 'consenso', { criterios: evaluacion.consenso.criterios, hallazgos: evaluacion.consenso.hallazgos, positivos: evaluacion.consenso.positivos ?? [], conclusion: evaluacion.consenso.conclusion ?? '', mejoras: (evaluacion.consenso.mejoras ?? []).filter(m => !mejoraVacia(m)) }, onSaved, subiendoCapturas, !soloLectura);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bloqueo = busy || soloLectura;
  const [pidiendo, setPidiendo] = useState(false);
  const [comentario, setComentario] = useState('');
  const [avisoEquipo, setAvisoEquipo] = useState('');
  const [nuevaId, setNuevaId] = useState<string | null>(null);
  const decisiones = useRef<Record<string, HTMLFieldSetElement | null>>({});
  const confirmacion = useRef<HTMLElement>(null);
  useEffect(() => { if (!nuevaId) return; decisiones.current[nuevaId]?.focus(); setNuevaId(null); }, [nuevaId]);
  // Si todos coinciden en una pregunta, la respuesta común queda precargada (el borrador queda sin guardar y se autoguarda).
  useEffect(() => { if (soloLectura) return; if (precargarConsenso(evaluacion.configuracion, evaluacion.trabajos, state.draft.criterios) !== state.draft.criterios) state.setDraft(prev => ({ ...prev, criterios: precargarConsenso(evaluacion.configuracion, evaluacion.trabajos, prev.criterios) })); }, [evaluacion.configuracion, evaluacion.trabajos, state.draft.criterios, soloLectura]);
  // Los problemas individuales llegan al acuerdo como decisiones pendientes (el borrador queda sin guardar y se autoguarda).
  // Los problemas agregados por el equipo (F31) llegan igual, con su autor.
  const aportes = evaluacion.consenso.aportes;
  useEffect(() => { if (soloLectura || !precargarDecisiones(evaluacion.trabajos, state.draft.hallazgos, aportes).length) return; state.setDraft(prev => ({ ...prev, hallazgos: [...prev.hallazgos, ...precargarDecisiones(evaluacion.trabajos, prev.hallazgos, aportes)] })); }, [evaluacion.trabajos, aportes, state.draft.hallazgos, soloLectura]);
  // Los aspectos positivos que agregó el resto del equipo llegan al borrador con su autor; los que quien redacta quitó no vuelven.
  const aportesPositivos = evaluacion.consenso.aportesPositivos;
  const positivosQuitados = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (soloLectura || !aportesPositivos?.length) return;
    const nuevos = aportesPositivos.filter(a => !positivosQuitados.current.has(a.id) && !(state.draft.positivos ?? []).some(p => p.id === a.id));
    if (nuevos.length) state.setDraft(prev => ({ ...prev, positivos: [...prev.positivos, ...nuevos.filter(a => !prev.positivos.some(p => p.id === a.id))] }));
  }, [aportesPositivos, state.draft.positivos, soloLectura]);
  const criterios = evaluacion.configuracion.metodologia.criterios;
  const acordadas = criterios.filter(c => { const r = state.draft.criterios.find(x => x.criterioId === c.id); return !!r && (r.noAplica || r.valor !== null); }).length;
  const confirmaron = evaluacion.trabajos.filter(t => evaluacion.consenso.aprobadoPor.includes(t.evaluadorId) && !state.dirty);
  const faltan = evaluacion.trabajos.filter(t => !confirmaron.includes(t));
  const yaConfirmo = evaluacion.consenso.aprobadoPor.includes(usuarioId) && !state.dirty;
  const nombreDe = (id: string) => equipo?.find(m => m.id === id)?.nombre ?? evaluacion.trabajos.find(t => t.evaluadorId === id)?.nombre ?? 'El coordinador';
  const esExperto = evaluacion.configuracion.evaluadorIds.includes(usuarioId);
  const pendientes = pendientesAcuerdo({ ...evaluacion, consenso: { ...evaluacion.consenso, ...state.draft } });
  const completo = pendientes.length === 0;
  /** F33 (D7): un solo botón principal por estado del acuerdo. */
  const todosConfirmaron = evaluacion.configuracion.evaluadorIds.every(id => evaluacion.consenso.aprobadoPor.includes(id));
  const yaEntregado = evaluacion.consenso.aprobadoPor.includes(redactorId) && !state.dirty;
  const nuevos = state.draft.hallazgos.filter(h => origenHallazgo(h) === 'equipo').length;
  /** Quién agregó cada problema (D8): el dueño del trabajo individual, quien lo aportó o quien redacta. */
  const autoriaDe = (h: DecisionHallazgo) => {
    const aporte = aportes?.find(a => h.origenIds.includes(a.id));
    if (aporte) return `Agregado por ${nombreDe(aporte.autorId)} · ${fechaChile(aporte.creadoEn)}`;
    const t = evaluacion.trabajos.find(x => x.hallazgos.some(o => h.origenIds.includes(o.id)));
    if (t) return `Problema individual de ${t.nombre}`;
    if (h.autorId) return `Agregado por ${nombreDe(h.autorId)}${h.creadoEn ? ` · ${fechaChile(h.creadoEn)}` : ''}`;
    return 'Agregado por el equipo';
  };
  const update = (h: DecisionHallazgo) => state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.map(x => x.id === h.id ? h : x) });
  /** Lo que le falta a una decisión para estar lista (vacío = lista). */
  const faltasDe = (id: string) => pendientes.filter(p => p.seccion === 'hallazgos' && p.id === id).flatMap(p => p.faltas);
  // Los problemas listos se pliegan a un resumen para no ocupar tanta pantalla (como los aspectos positivos).
  const [plegados, setPlegados] = useState<ReadonlySet<string>>(() => {
    const inicial = pendientesAcuerdo(evaluacion);
    return new Set(evaluacion.consenso.hallazgos.filter(h => !inicial.some(p => p.seccion === 'hallazgos' && p.id === h.id)).map(h => h.id));
  });
  const plegar = (id: string, si: boolean) => setPlegados(prev => { const n = new Set(prev); if (si) n.add(id); else n.delete(id); return n; });
  const [faltasVisibles, setFaltasVisibles] = useState<string | null>(null);
  // Llevar a lo que falta: cambia de paso si hace falta, despliega, desplaza y destaca.
  const [paso, setPaso] = useState(0);
  const [enfoqueCriterio, setEnfoqueCriterio] = useState<{ criterioId: string; marca: number } | undefined>();
  const [destacado, setDestacado] = useState<{ id: string; marca: number } | null>(null);
  const [llevadoA, setLlevadoA] = useState('');
  useEffect(() => {
    if (!destacado) return;
    const mostrar = setTimeout(() => {
      const el = document.getElementById(destacado.id);
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      el?.focus({ preventScroll: true });
    }, 0);
    const apagar = setTimeout(() => setDestacado(null), 6000);
    return () => { clearTimeout(mostrar); clearTimeout(apagar); };
  }, [destacado?.marca]);
  function irAPendiente(p: (typeof pendientes)[number]) {
    const marca = Date.now();
    if (p.seccion === 'criterios') { setPaso(0); setEnfoqueCriterio({ criterioId: p.id, marca }); }
    else {
      setPaso(1);
      if (p.seccion === 'hallazgos') {
        const h = state.draft.hallazgos.find(x => x.id === p.id || x.origenIds.includes(p.id));
        if (!h) return;
        plegar(h.id, false); setFaltasVisibles(h.id); setDestacado({ id: `decision-${h.id}`, marca });
      } else if (p.seccion === 'positivos') setDestacado({ id: `positivo-${p.id}`, marca });
      else return;
    }
    setLlevadoA(`Te llevé a lo que falta: ${p.nombre}. ${p.faltas.join(' ')}`);
  }
  function guardarDecision(h: DecisionHallazgo) {
    if (faltasDe(h.id).length) { setFaltasVisibles(h.id); setDestacado({ id: `decision-${h.id}`, marca: Date.now() }); return; }
    setFaltasVisibles(null); plegar(h.id, true);
    void state.save().catch(() => {});
  }
  const DECISION: Record<DecisionHallazgo['decision'], string> = { PENDIENTE: 'Pendiente', ACEPTADO: 'Aceptado: entra al informe', DESCARTADO: 'Descartado: no entra al informe' };
  function renderDecision(h: DecisionHallazgo, i: number) {
    const esEquipo = origenHallazgo(h) === 'equipo';
    const n = i + 1;
    const quitar = esEquipo && !soloLectura && <button type="button" className="link-btn link-btn--delete" disabled={bloqueo} onClick={() => {
      setAvisoEquipo('');
      state.setDraft({ ...state.draft, hallazgos: state.draft.hallazgos.filter(x => x.id !== h.id) });
    }}>{`Quitar problema ${n}`}</button>;
    if (plegados.has(h.id)) return <article key={h.id} id={`decision-${h.id}`} tabIndex={-1} className="hf-form-resumen" data-destacado={destacado?.id === `decision-${h.id}` || undefined} aria-label={`Decisión ${n}: ${h.titulo}`}>
      <div>
        <h4>{h.titulo || 'Problema sin título'}</h4>
        <p className="hf-form-meta">{DECISION[h.decision]} · Severidad {h.severidad} · {autoriaDe(h)}{h.evidenciaIds.length ? ` · ${h.evidenciaIds.length} captura${h.evidenciaIds.length === 1 ? '' : 's'}` : ''}</p>
        <p className="hf-form-meta" role="status">Problema guardado con éxito</p>
      </div>
      <div className="hf-form-resumen-acciones">
        <button type="button" className="ghost" onClick={() => plegar(h.id, false)}>{soloLectura ? `Ver problema ${n}` : `Editar problema ${n}`}</button>
        {quitar}
      </div>
    </article>;
    const faltas = faltasVisibles === h.id ? faltasDe(h.id) : [];
    return <fieldset key={h.id} id={`decision-${h.id}`} disabled={bloqueo} tabIndex={-1} className="hf-form-card" data-destacado={destacado?.id === `decision-${h.id}` || undefined} ref={el => { decisiones.current[h.id] = el; }}>
      <legend>Decisión {n}: {h.titulo}</legend>
      <p className="hf-autoria">{autoriaDe(h)}</p>
      <Field label="Decisión del consenso"><select value={h.decision} onChange={e => update({ ...h, decision: e.target.value as DecisionHallazgo['decision'] })}><option value="PENDIENTE">Pendiente</option><option value="ACEPTADO">Aceptar problema único</option><option value="DESCARTADO">Descartar conservando original</option></select></Field>
      <HallazgoEditor value={h} config={evaluacion.configuracion} conCriterios={false} onChange={x => update({ ...h, ...x })} />
      <Field label="Justificación de aceptación, fusión o descarte"><textarea value={h.justificacion} onChange={e => update({ ...h, justificacion: e.target.value })} /></Field>
      {/* Los problemas nuevos del equipo suben y anotan sus capturas aquí; los de origen muestran las de su autor. */}
      <div className="hf-form-evidencia">
        <h4>Capturas{esEquipo ? <small> (opcional)</small> : null}</h4>
        <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={esEquipo && !bloqueo}
          onChange={esEquipo ? ids => state.setDraft(prev => ({ ...prev, hallazgos: prev.hallazgos.map(x => x.id === h.id ? { ...x, evidenciaIds: ids } : x) })) : undefined} onPendingChange={esEquipo ? v => setSubiendo(p => p[h.id] === v ? p : { ...p, [h.id]: v }) : undefined} />
      </div>
      {faltas.length > 0 && <div role="alert" className="hf-error"><p>Para guardar el problema {n} falta:</p><ul>{faltas.map(f => <li key={f}>{f}</li>)}</ul></div>}
      {!soloLectura && <div className="hf-form-acciones">
        {quitar}
        <button type="button" className="secondary" onClick={() => guardarDecision(h)}>{`Guardar problema ${n}`}</button>
      </div>}
    </fieldset>;
  }
  async function action(action: 'aprobar' | 'consolidar' | 'entregar-acuerdo') {
    setBusy(true); setError('');
    try {
      await state.save();
      const r = await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/${action}`, 'POST', { revision: state.getRevision() });
      onSaved(r);
      if (action === 'aprobar' || action === 'entregar-acuerdo') {
        const faltan = r.trabajos.filter(t => !r.consenso.aprobadoPor.includes(t.evaluadorId)).map(t => t.nombre);
        notify.success(action === 'entregar-acuerdo' ? 'Entregaste el acuerdo. Los demás expertos pueden confirmarlo o pedir cambios.' : faltan.length ? `Confirmaste el acuerdo. Falta que confirme: ${faltan.join(', ')}.` : 'Confirmaste el acuerdo. Ya confirmaron todas las personas.');
        confirmacion.current?.focus(); confirmacion.current?.scrollIntoView?.({ block: 'center' });
      }
    }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción'); } finally { setBusy(false); }
  }
  async function actualizar() {
    if (!(await state.confirmLeave())) return;
    try { await state.reloadRevision(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); }
  }
  async function pedirCambios() {
    setBusy(true); setError('');
    try { await state.save(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/pedir-cambios`, 'POST', { revision: state.getRevision(), comentario: comentario.trim() })); setPidiendo(false); setComentario(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar el pedido de cambios'); } finally { setBusy(false); }
  }
  return <>
    <button type="button" className="secondary hf-volver" onClick={async () => { if (await state.confirmLeave()) onBack(); }}><span aria-hidden="true">←</span> Volver</button>
    <div className="page-head"><div><h2>Acuerdo del equipo · {evaluacion.configuracion.nombre}</h2><p>Todos terminaron su revisión. Ahora comparen sus respuestas, decidan juntos y preparen el informe.</p></div></div>
    <div className="hf-barra"><button type="button" className="ghost" disabled={state.saving || busy} onClick={async () => { if (!(await state.confirmLeave())) return; try { await state.reloadRevision(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); } }}>Actualizar consenso y confirmaciones</button>
    <SaveStatus {...state} /></div>
    <section className="panel hf-progreso" aria-label="Progreso del acuerdo"><p><strong>{acordadas} de {criterios.length} preguntas acordadas</strong></p>
      <p>Confirmaron {confirmaron.length} de {evaluacion.trabajos.length} evaluadores{confirmaron.length ? `: ${confirmaron.map(t => t.nombre).join(', ')}` : ''}.</p>
      {faltan.length > 0 && <p>Falta confirmar: {faltan.map(t => t.nombre).join(', ')}.</p>}
      <p>{soloLectura ? `Redacta el acuerdo: ${nombreDe(redactorId)}. Solo esa persona puede editarlo; tú puedes leerlo y confirmarlo.` : 'Tú redactas el acuerdo.'}</p>
      {evaluacion.consenso.guardadoPor && evaluacion.consenso.guardadoEn && <p>{`Última edición por ${nombreDe(evaluacion.consenso.guardadoPor)} · ${fechaChile(evaluacion.consenso.guardadoEn)}`}</p>}</section>
    <RedactorPanel evaluacion={evaluacion} usuarioId={usuarioId} nombreDe={nombreDe} guardar={state.save} getRevision={state.getRevision} onSaved={onSaved} onActualizar={state.reloadRevision} />
    <p role="status" className="hf-llevado">{llevadoA}</p>
    <RecorridoSencillo paso={paso} onPaso={setPaso} pasos={[{ titulo: 'Acordar las respuestas', ayuda: 'Lean las respuestas de cada persona y elijan una respuesta común. Expliquen por qué están de acuerdo.', contenido: (<>
    <fieldset disabled={bloqueo}><legend>Acuerdo por pregunta</legend>
      <MatrizItem criterios={criterios} config={evaluacion.configuracion} modo="equipo" respuestas={state.draft.criterios} editable={!soloLectura}
        individuales={evaluacion.trabajos.map(t => ({ evaluadorId: t.evaluadorId, nombre: t.nombre, respuestas: t.respuestas }))}
        guardado={{ dirty: state.dirty, saving: state.saving, error: state.error }} enfocar={enfoqueCriterio}
        onChange={r => state.setDraft(prev => ({ ...prev, criterios: [...prev.criterios.filter(x => x.criterioId !== r.criterioId), { ...r, justificacion: r.justificacion ?? '' }] }))} />
    </fieldset>
    </>) }, { titulo: 'Preparar el informe', ayuda: 'Decidan qué hacer con cada problema encontrado (aceptarlo o descartarlo), agreguen los que detectó el equipo y escriban qué recomiendan mejorar. Cada persona debe confirmar el acuerdo antes de que el coordinador prepare el informe.', contenido: (<>
    <section className="panel" aria-labelledby="hf-problemas-equipo">
      <div className="panel-head"><h2 id="hf-problemas-equipo">Problemas que detectó el equipo</h2></div>
      <div className="hf-form-lista">
        <p className="hf-ayuda">Cualquier persona del equipo puede agregar problemas; queda registrado quién lo agregó. Quien redacta decide si cada uno entra al informe. Al guardar un problema se pliega para dejar espacio al siguiente. {nuevos} de {MAX_HALLAZGOS_NUEVOS_EQUIPO} agregados por quien redacta.</p>
        {state.draft.hallazgos.map((h, i) => renderDecision(h, i))}
        <p role="status" className="hf-aviso">{avisoEquipo}</p>
        {/* Abajo de la lista: al terminar un problema se puede empezar el siguiente sin volver arriba. */}
        {!soloLectura && <button type="button" className="secondary hf-form-agregar" disabled={busy || nuevos >= MAX_HALLAZGOS_NUEVOS_EQUIPO} onClick={() => {
          const nueva: DecisionHallazgo = { ...hallazgoVacio(criterios[0].id), criterioIds: [], origenIds: [], decision: 'PENDIENTE', justificacion: '', autorId: usuarioId, creadoEn: new Date().toISOString() };
          state.setDraft({ ...state.draft, hallazgos: [...state.draft.hallazgos, nueva] });
          setAvisoEquipo(`Problema creado como decisión ${state.draft.hallazgos.length + 1}. Complétalo en esta sección.`);
          setNuevaId(nueva.id);
        }}>Agregar problema</button>}
      </div>
      {soloLectura && (esExperto || usuarioId === evaluacion.coordinadorId) && <AporteEquipo evaluacion={evaluacion} usuarioId={usuarioId} nombreDe={nombreDe} onSaved={onSaved} />}
    </section>
    <section className="panel hf-form-seccion" aria-labelledby="hf-positivos-titulo"><div className="panel-head"><div><h2 id="hf-positivos-titulo">Lo que funciona bien</h2><p className="hf-ayuda">Opcional. Registra los aciertos del producto, con capturas si ayudan a mostrarlos.</p></div></div>
      <AspectosPositivos evaluacion={evaluacion} positivos={state.draft.positivos} bloqueo={bloqueo} destacadoId={destacado?.id} usuarioId={usuarioId} nombreDe={nombreDe} ocultarAgregar={soloLectura}
        onChange={positivos => { state.draft.positivos.filter(p => !positivos.some(x => x.id === p.id)).forEach(p => positivosQuitados.current.add(p.id)); state.setDraft(prev => ({ ...prev, positivos })); }}
        onPendingChange={(id, v) => setSubiendo(p => p[id] === v ? p : { ...p, [id]: v })} />
      {soloLectura && (esExperto || usuarioId === evaluacion.coordinadorId) && <AportePositivoEquipo evaluacion={evaluacion} usuarioId={usuarioId} nombreDe={nombreDe} onSaved={onSaved} />}
    </section>
    <section className="panel"><div className="panel-head"><h2>Conclusión y recomendaciones finales</h2></div>
      <Field label="Conclusión y recomendaciones finales"><textarea maxLength={10000} disabled={bloqueo} value={state.draft.conclusion} onChange={e => state.setDraft({ ...state.draft, conclusion: e.target.value })} /></Field>
    </section>
    <SaveStatus {...state} />
    <section className="panel" aria-label="Pendientes del acuerdo"><div className="panel-head"><h2>Pendientes para entregar el acuerdo</h2></div>
      {completo ? <p role="status">No hay pendientes: el acuerdo está completo.</p> : <>
        <p role="status">Faltan {pendientes.length} {pendientes.length === 1 ? 'elemento' : 'elementos'} por completar.</p>
        {(Object.keys(ETIQUETA_SECCION_ACUERDO) as SeccionAcuerdo[]).map(sec => { const items = pendientes.filter(p => p.seccion === sec); return items.length ? <div key={sec}><h3>{ETIQUETA_SECCION_ACUERDO[sec]} ({items.length})</h3><ul className="hf-pendientes-lista">{items.map(p => <li key={`${sec}:${p.id}`}><span>{p.nombre}: {p.faltas.join(' ')}</span>{sec !== 'mejoras' && <button type="button" className="link-btn" onClick={() => irAPendiente(p)}>Ir{' '}<span className="sr-only">a {p.nombre}</span></button>}</li>)}</ul></div> : null; })}
      </>}
    </section>
    <section className="panel" ref={confirmacion} tabIndex={-1}><div className="panel-head"><h2>Confirmación de todos los expertos</h2></div>{yaConfirmo && <p role="status"><strong>Ya confirmaste el acuerdo</strong></p>}<p>Editar el consenso revoca las confirmaciones previas. {state.dirty ? 'Hay cambios pendientes: las aprobaciones visibles corresponden a la versión guardada.' : ''}</p>
      <ul>{evaluacion.trabajos.map(t => <li key={t.evaluadorId}>{t.nombre}: {evaluacion.consenso.aprobadoPor.includes(t.evaluadorId) && !state.dirty ? 'Confirmado' : 'Confirmación pendiente'}</li>)}</ul>
      <div className="hf-cambios-pedidos"><div className="hf-cambios-cabecera"><h3>Cambios pedidos</h3>
        <button type="button" className="secondary hf-actualizar" disabled={state.saving || busy} onClick={() => void actualizar()}><span aria-hidden="true">↻</span> Actualizar cambios pedidos</button></div>
        {(() => {
          // Traza completa: cada pedido queda con quién, cuándo y si ya se atendió. Los acuerdos anteriores a la traza muestran solo el pedido vigente.
          const traza = evaluacion.consenso.historialCambios ?? [];
          const vigentes = (evaluacion.consenso.pedidosCambios ?? []).filter(p => !traza.some(h => h.evaluadorId === p.evaluadorId && h.creadoEn === p.creadoEn));
          const filas = [...traza.map(h => ({ clave: h.id, ...h })), ...vigentes.map(p => ({ clave: `${p.evaluadorId}:${p.creadoEn}`, id: p.evaluadorId, ...p, atendidoEn: undefined as string | undefined }))].sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn));
          return filas.length ? <ul className="hf-historial-cambios">{filas.map(f => <li key={f.clave}>{nombreDe(f.evaluadorId)} pidió cambios: {f.comentario} <em>· {fechaChile(f.creadoEn)} · {f.atendidoEn ? `atendido el ${fechaChile(f.atendidoEn)}` : 'pendiente'}</em></li>)}</ul> : <p className="hf-ayuda">Nadie ha pedido cambios.</p>;
        })()}
      </div>
      {!soloLectura && <p className="hf-ayuda">Al entregar el acuerdo quedas confirmado automáticamente. Los demás expertos podrán confirmarlo o pedir cambios.</p>}
      <div className="hf-actions">{!soloLectura && <button type="button" className={!yaEntregado && !todosConfirmaron ? 'primary' : 'secondary'} disabled={busy || state.saving} onClick={() => {
        // Si falta algo, en vez de un botón inactivo se lleva a la persona a lo primero que falta.
        if (!completo) { const primero = pendientes.find(p => p.seccion !== 'mejoras'); if (primero) irAPendiente(primero); return; }
        void action('entregar-acuerdo');
      }}>Entregar acuerdo</button>}
      {soloLectura && esExperto && <><button type="button" className={yaConfirmo || todosConfirmaron ? 'secondary' : 'primary'} disabled={busy || state.saving || !completo || yaConfirmo} onClick={() => void action('aprobar')}>Estoy de acuerdo</button>
        <button type="button" className="secondary" disabled={busy || pidiendo} onClick={() => setPidiendo(true)}>Pido cambios</button></>}
      {evaluacion.coordinadorId === usuarioId && <button type="button" className={todosConfirmaron ? 'primary' : 'secondary'} disabled={busy || state.saving || state.dirty || !todosConfirmaron} onClick={() => void action('consolidar')}>Preparar informe</button>}</div>
      {soloLectura && esExperto && pidiendo && <div className="hf-pedir-cambios"><label className="field">Qué cambios pides<textarea maxLength={2000} disabled={busy} value={comentario} onChange={e => setComentario(e.target.value)} /></label>
        <div className="hf-actions"><button type="button" className="primary" disabled={busy || !comentario.trim()} onClick={() => void pedirCambios()}>Enviar pedido de cambios</button>
        <button type="button" className="ghost" disabled={busy} onClick={() => { setPidiendo(false); setComentario(''); }}>Cancelar</button></div></div>}
    </section>
    </>) }]} />
    {error && <p role="alert" className="hf-error">{error}</p>}
  </>;
}
