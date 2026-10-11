import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resumirEvaluacion } from '@observatorio-ux/shared-types';
import type { ComparacionFlujo, EstadoComparacion, EvaluacionFlujo, VinculoComparacion } from '@observatorio-ux/shared-types';
import { Field, Fuente } from './ConfiguracionEditor';
import { EvidenciaEditor } from './EvidenciaEditor';
import { SaveStatus } from './TrabajoEditor';
import { flujoRequest } from './flujo.api';
import { useFlujoDraft } from './useFlujoDraft';

function ComparacionEditor({ actual, anterior, comparacion, usuarioId, onSaved, registerGuard }: { actual: EvaluacionFlujo; anterior: EvaluacionFlujo; comparacion: ComparacionFlujo; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; registerGuard: (guard: (() => Promise<boolean>) | null) => void }) {
  const anteriores = anterior.informe?.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO') ?? [];
  const actuales = actual.informe?.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO') ?? [];
  const vigente = actual.comparacion?.previaId === anterior.id ? actual.comparacion : comparacion;
  const state = useFlujoDraft(actual, usuarioId, 'comparacion', { previaId: anterior.id, vinculos: vigente.vinculos }, onSaved, false, false, anterior.id);
  useEffect(() => { registerGuard(state.confirmLeave); return () => registerGuard(null); }, [state.dirty, state.saving]);
  const editable = actual.coordinadorId === usuarioId;
  const estados: EstadoComparacion[] = comparacion.compatible ? ['NO_VERIFICADO', 'SOLUCIONADO', 'PERMANECE', 'MEJORO', 'EMPEORO', 'NUEVO', 'NO_COMPARABLE'] : ['NO_VERIFICADO', 'NO_COMPARABLE'];
  const update = (index: number, patch: Partial<VinculoComparacion>) => state.setDraft({ ...state.draft, vinculos: state.draft.vinculos.map((v, i) => i === index ? { ...v, ...patch } : v) });
  return <section className="panel"><div className="panel-head"><h2>Comparación entre versiones finalizadas</h2></div>
    <p>{comparacion.compatible ? 'Criterios, alcance y escala compatibles.' : `No comparable: ${comparacion.motivos.join(' · ')}`}</p><p>La ausencia de un problema no demuestra que esté solucionado. Vincula y verifica manualmente cada estado con una justificación. Los problemas sin correspondencia confirmada siguen NO_VERIFICADO.</p>
    {!editable && <p>Solo lectura. {vigente.confirmadoEn ? `Confirmada el ${new Date(vigente.confirmadoEn).toLocaleString()}` : 'Comparación aún sin confirmar.'}</p>}
    <fieldset disabled={!editable || state.saving}><legend>Correspondencias verificadas por una persona</legend>{state.draft.vinculos.map((v, i) => <fieldset key={i}><legend>Vínculo {i + 1}</legend><div className="hf-grid">
      <Field label="Problema de versión anterior"><select value={v.anteriorId ?? ''} onChange={e => update(i, { anteriorId: e.target.value || null })}><option value="">Sin origen anterior</option>{anteriores.map(h => <option key={h.id} value={h.id}>{h.titulo}</option>)}</select></Field>
      <Field label="Problema de versión actual"><select value={v.actualId ?? ''} onChange={e => update(i, { actualId: e.target.value || null })}><option value="">Sin correspondencia actual</option>{actuales.map(h => <option key={h.id} value={h.id}>{h.titulo}</option>)}</select></Field>
      <Field label="Estado verificado"><select value={v.estado} onChange={e => update(i, { estado: e.target.value as EstadoComparacion })}>{estados.map(s => <option key={s}>{s}</option>)}</select></Field></div>
      <Field label="Justificación y verificación manual"><textarea value={v.justificacion} onChange={e => update(i, { justificacion: e.target.value })} /></Field>
      {editable && <button type="button" onClick={() => state.setDraft({ ...state.draft, vinculos: state.draft.vinculos.filter((_, j) => j !== i) })}>Quitar vínculo {i + 1}</button>}
    </fieldset>)}</fieldset>
    {editable && <><button type="button" onClick={() => state.setDraft({ ...state.draft, vinculos: [...state.draft.vinculos, { anteriorId: null, actualId: null, estado: 'NO_VERIFICADO', justificacion: '' }] })}>Agregar correspondencia</button><SaveStatus {...state} /></>}
  </section>;
}
export function InformeView({ evaluacion, historial, usuarioId, onSaved, onBack }: { evaluacion: EvaluacionFlujo; historial: EvaluacionFlujo[]; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const [previaId, setPreviaId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const leaveGuard = useRef<(() => Promise<boolean>) | null>(null);
  const compare = useQuery({ queryKey: ['heuristica-flujo', evaluacion.proyectoId, usuarioId, evaluacion.id, 'comparacion', previaId], queryFn: () => flujoRequest<ComparacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/comparacion/${previaId}`), enabled: !!previaId });
  const informe = evaluacion.informe;
  if (!informe) return <p role="alert">El informe consolidado no está disponible.</p>;
  const config = informe.configuracion;
  const resumen = resumirEvaluacion(config, informe.consenso);
  const opciones = historial.filter(e => e.id !== evaluacion.id && e.fase === 'FINALIZADA' && e.configuracion.producto.clave === config.producto.clave);
  async function action(action: 'finalizar' | 'version') {
    setBusy(true); setError('');
    try { onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/${action}`, 'POST', { revision: evaluacion.revision })); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción'); } finally { setBusy(false); }
  }
  return <>
    <button type="button" className="text-button" onClick={async () => { if (!leaveGuard.current || await leaveGuard.current()) onBack(); }}>← Evaluaciones</button>
    <div className="page-head"><div><h2>Informe · {config.nombre}</h2><p>{evaluacion.fase === 'FINALIZADA' ? 'Informe final inmutable' : 'Informe consolidado pendiente de finalización'} · Revisión {informe.version}</p></div><span className="badge">{evaluacion.fase}</span></div>
    <section className="panel"><div className="panel-head"><h2>Contexto y método</h2></div><dl className="hx-stats">
      <div><dt>Producto</dt><dd>{config.producto.nombre} · {config.producto.clave} · {config.producto.version}</dd></div><div><dt>URL y dispositivo</dt><dd>{config.producto.url} · {config.producto.dispositivo}</dd></div>
      <div><dt>Objetivo</dt><dd>{config.objetivo}</dd></div><div><dt>Tareas</dt><dd>{config.tareas}</dd></div><div><dt>Pantallas</dt><dd>{config.pantallas}</dd></div><div><dt>Exclusiones</dt><dd>{config.exclusiones || 'Ninguna declarada'}</dd></div>
      <div><dt>Metodología</dt><dd>{config.metodologia.nombre} · {config.metodologia.autor} · {config.metodologia.version}</dd></div><div><dt>Escala</dt><dd>{config.metodologia.escala.tipo} · {config.metodologia.escala.sentido} · {config.metodologia.escala.fuente}</dd></div>
      <div><dt>Evaluadores</dt><dd>{informe.evaluadores.map(e => e.nombre).join(', ')}</dd></div><div><dt>Confirmaciones</dt><dd>{informe.consenso.aprobadoPor.length}/{informe.evaluadores.length}</dd></div>
      <div><dt>Fechas</dt><dd>Inicio: {informe.iniciadoEn ?? '—'} · Consolidación: {informe.consolidadoEn} · Finalización: {informe.finalizadoEn ?? 'Pendiente'}</dd></div>
    </dl></section>
    <section className="panel"><div className="panel-head"><h2>Cobertura y distribución del consenso</h2></div><dl className="hx-stats"><div><dt>Criterios evaluados</dt><dd>{resumen.evaluados}/{config.metodologia.criterios.length}</dd></div><div><dt>No aplica justificado</dt><dd>{resumen.noAplica}</dd></div><div><dt>Pendientes</dt><dd>{resumen.pendientes}</dd></div><div><dt>Problemas únicos aceptados</dt><dd>{resumen.totalHallazgos}</dd></div></dl>
      <ul aria-label="Distribución de valoraciones">{resumen.porCategoria.map(c => <li key={c.id}>{c.etiqueta}: {c.count}</li>)}</ul><ul aria-label="Distribución de severidad">{resumen.porSeveridad.map((count, i) => <li key={i}>Severidad {i}: {count}</li>)}</ul>
      {resumen.formula && <p>Índice: {resumen.indice ?? 'No calculable'} · Fórmula: {resumen.formula} · Denominador: {resumen.denominador}</p>}
    </section>
    <section className="panel"><div className="panel-head"><h2>Acuerdo y procedencia por criterio</h2></div><div className="hf-table"><table><thead><tr><th>Criterio / origen</th><th>Acuerdo</th><th>Justificación</th></tr></thead><tbody>{config.metodologia.criterios.map(c => { const r = informe.consenso.criterios.find(r => r.criterioId === c.id); return <tr key={c.id}><td>{c.nombre}<br />{c.origen.autor} · {c.origen.version}<br /><Fuente value={c.origen.fuente} /></td><td>{r?.noAplica ? `No aplica: ${r.motivo}` : config.metodologia.escala.niveles.find(n => n.id === r?.valor)?.etiqueta ?? 'Pendiente'}</td><td>{r?.justificacion}<br />{r?.notas}</td></tr>; })}</tbody></table></div></section>
    <section className="panel"><div className="panel-head"><h2>Problemas únicos y decisiones</h2></div>{informe.consenso.hallazgos.map(h => <article className="finding" key={h.id}><h3>{h.titulo} · {h.decision}</h3><p>Origen: {h.origenIds.join(', ')} · {h.justificacion}</p>{h.decision === 'ACEPTADO' && <><p>{h.pantalla}: {h.descripcion}</p><p>Severidad {h.severidad} · Prioridad {h.prioridad}</p><p>Recomendación: {h.recomendacion}</p><p>{h.notas}</p><EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={false} /></>}</article>)}</section>
    <div className="hf-actions"><button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const { exportarInformeFlujoPdf } = await import('./informe-pdf'); await exportarInformeFlujoPdf(evaluacion.proyectoId, evaluacion); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar PDF'); } finally { setBusy(false); } }}>Descargar informe PDF</button>
      {evaluacion.coordinadorId === usuarioId && (evaluacion.fase === 'CONSOLIDADA' ? <button type="button" className="primary" disabled={busy} onClick={() => void action('finalizar')}>Finalizar y fijar informe</button> : <button type="button" className="primary" disabled={busy} onClick={() => void action('version')}>Crear nueva revisión independiente</button>)}</div>
    {evaluacion.fase === 'FINALIZADA' && <><Field label="Comparar con evaluación finalizada del mismo producto"><select value={previaId} onChange={async e => { const id = e.target.value; if (!leaveGuard.current || await leaveGuard.current()) setPreviaId(id); }}><option value="">Seleccionar evaluación anterior</option>{opciones.map(e => <option key={e.id} value={e.id}>{e.configuracion.nombre} · {e.configuracion.producto.version} · {new Date(e.finalizadoEn ?? e.updatedAt).toLocaleDateString()}</option>)}</select></Field>
      {compare.isLoading && <p role="status">Comprobando compatibilidad…</p>}{compare.error && <p role="alert" className="hf-error">{compare.error.message}</p>}
      {compare.data && opciones.find(e => e.id === previaId) && <ComparacionEditor key={previaId} actual={evaluacion} anterior={opciones.find(e => e.id === previaId)!} comparacion={compare.data} usuarioId={usuarioId} onSaved={onSaved} registerGuard={guard => { leaveGuard.current = guard; }} />}</>}
    {error && <p role="alert" className="hf-error">{error}</p>}
  </>;
}

