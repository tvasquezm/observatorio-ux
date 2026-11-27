import { InfoTip } from '../../shared/components/ui/InfoTip';
import { TECNICAS_INFO } from '../../shared/content/tecnicas-info';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { escalaDe, origenHallazgo, resumirCumplimiento, resumirEvaluacion } from '@observatorio-ux/shared-types';
import type { ComparacionFlujo, EstadoComparacion, EvaluacionFlujo, MiembroEquipoFlujo, VinculoComparacion } from '@observatorio-ux/shared-types';
import { notify } from '../../shared/api/toast';
import { Field, Fuente } from './ConfiguracionEditor';
import { EvidenciaEditor } from './EvidenciaEditor';
import { SaveStatus } from './TrabajoEditor';
import { flujoRequest } from './flujo.api';
import { autoriaHallazgo, fechaChile, nombresInforme, participacionInforme, revisionInforme, textoCumplimiento, textoEscala } from './flujo-utils';
import { useFlujoDraft } from './useFlujoDraft';
import { ResumenCriterios } from './ResumenCriterios';
import { InformePdfDialog } from './InformePdfDialog';
import { Skeleton } from '../../shared/components/ui/Skeleton';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return <div><dt>{etiqueta}</dt><dd className="hx-dato">{valor || 'No indicado'}</dd></div>;
}
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
      {editable && <button type="button" className="secondary" onClick={() => state.setDraft({ ...state.draft, vinculos: state.draft.vinculos.filter((_, j) => j !== i) })}>Quitar vínculo {i + 1}</button>}
    </fieldset>)}</fieldset>
    {editable && <><button type="button" className="secondary" onClick={() => state.setDraft({ ...state.draft, vinculos: [...state.draft.vinculos, { anteriorId: null, actualId: null, estado: 'NO_VERIFICADO', justificacion: '' }] })}>Agregar correspondencia</button><SaveStatus {...state} /></>}
  </section>;
}
export function InformeView({ evaluacion, historial, usuarioId, onSaved, onBack, equipo }: { evaluacion: EvaluacionFlujo; historial: EvaluacionFlujo[]; usuarioId: string; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void; equipo?: MiembroEquipoFlujo[] }) {
  const [previaId, setPreviaId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const leaveGuard = useRef<(() => Promise<boolean>) | null>(null);
  const compare = useQuery({ queryKey: ['heuristica-flujo', evaluacion.proyectoId, usuarioId, evaluacion.id, 'comparacion', previaId], queryFn: () => flujoRequest<ComparacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/comparacion/${previaId}`), enabled: !!previaId });
  const informe = evaluacion.informe;
  if (!informe) return <p role="alert">El informe consolidado no está disponible.</p>;
  const config = informe.configuracion;
  const resumen = resumirEvaluacion(config, informe.consenso);
  const cumplimiento = resumirCumplimiento(config, informe.consenso);
  const positivos = informe.consenso.positivos ?? [];
  const mejoras = informe.consenso.mejoras ?? [];
  const participacion = participacionInforme(informe, evaluacion.coordinadorId);
  const conclusion = (informe.consenso.conclusion ?? '').trim();
  const nombres = nombresInforme(evaluacion, equipo);
  const revision = revisionInforme(evaluacion, nombres);
  const opciones = historial.filter(e => e.id !== evaluacion.id && e.fase === 'FINALIZADA' && e.configuracion.producto.clave === config.producto.clave);
  async function action(action: 'finalizar' | 'version') {
    setBusy(true); setError('');
    try {
      const r = await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/${action}`, 'POST', { revision: evaluacion.revision });
      onSaved(r);
      if (action === 'finalizar') { onBack(); notify.success('Evaluación terminada. Puedes abrir el informe final desde Mis revisiones.'); }
    }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción'); } finally { setBusy(false); }
  }
  const NIVEL_SEVERIDAD = ['Sin problema', 'Cosmético', 'Menor', 'Mayor', 'Crítico'];
  /** F38: primero los problemas a mejorar, de mayor a menor severidad; luego los que quedaron por revisar o descartados. */
  const orden = (d: string) => d === 'ACEPTADO' ? 0 : d === 'PENDIENTE' ? 1 : 2;
  const hallazgos = [...informe.consenso.hallazgos].sort((a, b) => orden(a.decision) - orden(b.decision) || b.severidad - a.severidad);
  const secciones = [
    { id: 'inf-resultado', titulo: 'Resultado' },
    { id: 'inf-mejoras', titulo: 'Qué se puede mejorar' },
    ...(cumplimiento ? [{ id: 'inf-cumplimiento', titulo: 'Cumplimiento' }] : []),
    ...(positivos.length ? [{ id: 'inf-positivos', titulo: 'Lo que funciona bien' }] : []),
    ...(mejoras.length ? [{ id: 'inf-antes-despues', titulo: 'Antes y después' }] : []),
    ...(conclusion ? [{ id: 'inf-conclusion', titulo: 'Conclusión' }] : []),
    { id: 'inf-detalle', titulo: 'Detalle' },
    ...(evaluacion.fase === 'FINALIZADA' ? [{ id: 'inf-comparacion', titulo: 'Comparación' }] : []),
  ];
  return <>
    <button type="button" className="secondary hf-volver" onClick={async () => { if (!leaveGuard.current || await leaveGuard.current()) onBack(); }}><span aria-hidden="true">←</span> Volver</button>
    {/* (1) Encabezado con estado y acciones (F38). */}
    <div className="page-head hf-informe-encabezado"><div><h2>Informe · {config.nombre}</h2><p>{evaluacion.fase === 'FINALIZADA' ? 'Informe final inmutable' : 'Informe consolidado pendiente de finalización'} · Revisión {informe.version}</p></div><span className="badge">{evaluacion.fase}</span>
      <div className="hf-actions hf-informe-acciones"><button type="button" className="secondary" disabled={busy} onClick={() => { setPdfError(''); setPdfOpen(true); }}>Descargar informe PDF</button>
        {evaluacion.coordinadorId === usuarioId && (evaluacion.fase === 'CONSOLIDADA' ? <button type="button" className="primary" disabled={busy} onClick={() => void action('finalizar')}>Finalizar informe</button> : <button type="button" className="primary" disabled={busy} onClick={() => void action('version')}>Crear nueva revisión independiente</button>)}</div></div>
    {error && <p role="alert" className="hf-error">{error}</p>}
    <nav className="hf-informe-indice" aria-label="Secciones del informe"><ul>{secciones.map(x => <li key={x.id}><a href={`#${x.id}`}>{x.titulo}</a></li>)}</ul></nav>
    {/* (2) Resultado en cifras. */}
    <section className="panel" id="inf-resultado" aria-labelledby="inf-resultado-t"><div className="panel-head"><h2 id="inf-resultado-t">Resultado de la revisión</h2><InfoTip label="Ayuda: resultado" visibleLabel="¿Cómo leer esto?" align="start">Un criterio puede tener varios hallazgos o ninguno: por eso esta cifra no coincide con la cantidad de criterios con problema.</InfoTip></div><dl className="hx-stats"><div><dt>Criterios evaluados</dt><dd>{resumen.evaluados}/{config.metodologia.criterios.length}</dd></div><div><dt>No aplica</dt><dd>{resumen.noAplica}</dd></div><div><dt>Pendientes</dt><dd>{resumen.pendientes}</dd></div><div><dt>Hallazgos aceptados para mejorar</dt><dd>{resumen.totalHallazgos}</dd></div></dl>
      <details><summary>Ver respuestas y gravedad de los problemas</summary><ul aria-label="Distribución de valoraciones">{resumen.porCategoria.map(c => <li key={c.id}>{c.etiqueta}: {c.count}</li>)}</ul>{resumen.porEscala.map(g => <ul key={g.fuente + g.tipo + g.distribucion.map(n => n.id).join()} aria-label={`Distribución con escala propia: ${g.fuente}`}>{g.distribucion.map(n => <li key={n.id}>{n.etiqueta}: {n.count} (escala propia: {g.fuente})</li>)}</ul>)}<ul aria-label="Distribución de severidad">{resumen.porSeveridad.map((count, i) => <li key={i}>Severidad {i}: {count}</li>)}</ul>
      {resumen.formula && <p>Índice: {resumen.indice ?? 'No calculable'} · Fórmula: {resumen.formula} · Denominador: {resumen.denominador}</p>}
      </details>
    </section>
    {/* (3) Lo más importante: qué mejorar, abierto y por severidad. */}
    <section className="panel" id="inf-mejoras" aria-labelledby="inf-mejoras-t"><div className="panel-head"><h2 id="inf-mejoras-t">Qué se puede mejorar</h2></div>
      {!hallazgos.length && <p>La revisión acordada no identificó problemas de usabilidad.</p>}
      {hallazgos.map(h => <article className="finding hf-hallazgo-tarjeta" key={h.id} data-severidad={h.severidad}>
        <h3>{h.titulo}</h3>
        <p className="hf-hallazgo-meta"><span className={`badge hf-severidad hf-severidad-${h.severidad}`}>Severidad {h.severidad} · {NIVEL_SEVERIDAD[h.severidad]}</span> <span>Prioridad {h.prioridad}</span> <span>{h.decision === 'ACEPTADO' ? 'Mejorar' : h.decision === 'DESCARTADO' ? 'Descartado' : 'Por revisar'}</span></p>
        {h.decision === 'ACEPTADO' && <>{h.recomendacion && <p><strong>Recomendación:</strong> {h.recomendacion}</p>}<p>{h.pantalla ? `${h.pantalla}: ` : ''}{h.descripcion}</p></>}
        <details><summary>Evidencia y notas</summary><p>Origen: {origenHallazgo(h) === 'equipo' ? 'Nuevo del equipo' : 'Hallazgo individual'}{autoriaHallazgo(evaluacion, h, nombres) ? ` · ${autoriaHallazgo(evaluacion, h, nombres)}` : ''} · Revisado por {revision.redactor}{revision.confirmaron.length ? ` · Acuerdo confirmado por ${revision.confirmaron.join(', ')}` : ''}{h.justificacion ? ` · ${h.justificacion}` : ''}</p>{h.notas && <p>{h.notas}</p>}{h.decision === 'ACEPTADO' && <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={h.evidenciaIds} editable={false} />}</details>
      </article>)}
    </section>
    {/* (4) Cumplimiento y criterios con problema o cumplidos. */}
    {cumplimiento && <section className="panel" id="inf-cumplimiento" aria-labelledby="inf-cumplimiento-t"><div className="panel-head"><h2 id="inf-cumplimiento-t">Cumplimiento</h2><InfoTip label="Ayuda: cumplimiento" visibleLabel="¿Cómo leer esto?" align="start">{TECNICAS_INFO['evaluacion-heuristica'].ayudaGraficos.cumplimiento}</InfoTip></div><p>El porcentaje compara aciertos y problemas. No incluye respuestas neutras, sin evaluar ni «No aplica».</p>
      <div className="hf-table"><table><thead><tr><th>Categoría</th><th>Cumplimiento</th></tr></thead><tbody>{cumplimiento.porCategoria.map(c => <tr key={c.categoria}><td>{c.categoria}</td><td>{textoCumplimiento(c)}</td></tr>)}<tr><th scope="row">Total</th><td>{textoCumplimiento(cumplimiento.total)}</td></tr></tbody></table></div></section>}
    <ResumenCriterios configuracion={config} consenso={informe.consenso} />
    {/* (5) Lo que funciona bien. */}
    {positivos.length > 0 && <section className="panel" id="inf-positivos" aria-labelledby="inf-positivos-t"><div className="panel-head"><h2 id="inf-positivos-t">Lo que funciona bien</h2></div>{positivos.map(p => <article className="finding" key={p.id}><h3>{p.titulo}</h3>{p.descripcion && <p>{p.descripcion}</p>}<p className="hf-hallazgo-meta">{p.autorId ? `Agregado por ${nombres[p.autorId] ?? 'una persona del equipo'}${p.creadoEn ? ` · ${fechaChile(p.creadoEn)}` : ''}` : `Redactado por ${revision.redactor}`} · Revisado por {revision.redactor}</p>{!!p.evidenciaIds?.length && <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={p.evidenciaIds} editable={false} />}</article>)}</section>}
    {/* (6) Antes y después. */}
    {mejoras.length > 0 && <section className="panel" id="inf-antes-despues" aria-labelledby="inf-antes-despues-t"><div className="panel-head"><h2 id="inf-antes-despues-t">Antes y después</h2></div>{mejoras.map((m, i) => <article className="finding" key={m.id}><h3>{i + 1}. {m.titulo}</h3>{m.descripcion && <p className="hf-texto-multilinea">{m.descripcion}</p>}
      <h4>Antes</h4>{m.antesIds.length ? <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={m.antesIds} editable={false} /> : <p>Sin capturas.</p>}
      <h4>Después</h4>{m.despuesIds.length ? <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={m.despuesIds} editable={false} /> : <p>Sin capturas.</p>}</article>)}</section>}
    {/* (7) Conclusión. */}
    {conclusion && <section className="panel" id="inf-conclusion" aria-labelledby="inf-conclusion-t"><div className="panel-head"><h2 id="inf-conclusion-t">Conclusión y recomendaciones finales</h2></div><p className="hf-texto-multilinea">{conclusion}</p></section>}
    {/* (8) Detalle: alcance, participantes y respuestas, plegados. */}
    <section className="panel" id="inf-detalle" aria-labelledby="inf-detalle-t"><div className="panel-head"><h2 id="inf-detalle-t">Detalle</h2></div>
    <details><summary>Ver qué se revisó y quién participó</summary>
      <section aria-labelledby="inf-que"><h3 id="inf-que">Qué se evaluó</h3><dl className="hx-stats">
        <Dato etiqueta="Producto" valor={[config.producto.nombre, config.producto.version && `versión ${config.producto.version}`].filter(Boolean).join(', ')} />
        <Dato etiqueta="Dirección web" valor={config.producto.url} /><Dato etiqueta="Dispositivo" valor={config.producto.dispositivo} />
        <Dato etiqueta="Objetivo" valor={config.objetivo.trim()} /><Dato etiqueta="Tareas" valor={config.tareas.trim()} /><Dato etiqueta="Pantallas" valor={config.pantallas.trim()} />
        {config.exclusiones.trim() && <Dato etiqueta="Exclusiones" valor={config.exclusiones} />}
      </dl></section>
      <section aria-labelledby="inf-crit"><h3 id="inf-crit">Con qué criterios</h3><dl className="hx-stats">
        <Dato etiqueta="Metodología" valor={[config.metodologia.nombre, config.metodologia.version].filter(Boolean).join(', ')} />
        {config.metodologia.autor && <Dato etiqueta="Autoría" valor={config.metodologia.autor} />}
        <Dato etiqueta="Criterios" valor={String(config.metodologia.criterios.length)} />
        <Dato etiqueta="Escala de respuesta" valor={textoEscala(config.metodologia.escala)} />
        <Dato etiqueta="Niveles" valor={config.metodologia.escala.niveles.map(n => n.etiqueta).join(', ')} />
        {config.metodologia.escala.fuente && <Dato etiqueta="Origen de la escala" valor={config.metodologia.escala.fuente} />}
      </dl></section>
      <section aria-labelledby="inf-quien"><h3 id="inf-quien">Quién participó</h3><dl className="hx-stats">
        <Dato etiqueta="Evaluadores" valor={informe.evaluadores.map(e => e.nombre).join(', ')} />
        <Dato etiqueta="Redactor del acuerdo" valor={participacion.redactor} />
        <Dato etiqueta="Confirmaciones" valor={`${participacion.confirmaciones.filter(c => c.confirmo).length} de ${participacion.confirmaciones.length}`} />
        <Dato etiqueta="Inicio de la revisión" valor={informe.iniciadoEn ? fechaChile(informe.iniciadoEn) : ''} />
        <Dato etiqueta="Acuerdo consolidado" valor={fechaChile(informe.consolidadoEn)} />
        <Dato etiqueta="Informe finalizado" valor={informe.finalizadoEn ? fechaChile(informe.finalizadoEn) : 'Pendiente'} />
      </dl>
      <ul aria-label="Confirmación por persona">{participacion.confirmaciones.map(c => <li key={c.id}>{c.nombre}: {c.confirmo ? 'confirmó el acuerdo' : 'falta confirmar'}</li>)}</ul></section>
    </details>
    <details><summary>Ver respuestas y razones del equipo, pregunta por pregunta</summary><div className="hf-table"><table><thead><tr><th>Criterio / origen</th><th>Acuerdo</th><th>Justificación</th></tr></thead><tbody>{config.metodologia.criterios.map(c => { const r = informe.consenso.criterios.find(r => r.criterioId === c.id); return <tr key={c.id}><td>{c.nombre}<br />{c.origen.autor} · {c.origen.version}<br /><Fuente value={c.origen.fuente} /></td><td>{r?.noAplica ? `No aplica${r.motivo ? `: ${r.motivo}` : ''}` : escalaDe(config.metodologia, c).niveles.find(n => n.id === r?.valor)?.etiqueta ?? 'Pendiente'}</td><td>{r?.justificacion}<br />{r?.notas}</td></tr>; })}</tbody></table></div></details>
    </section>
    {/* (9) Comparación con la versión anterior. */}
    {evaluacion.fase === 'FINALIZADA' && <section className="panel" id="inf-comparacion" aria-labelledby="inf-comparacion-t"><div className="panel-head"><h2 id="inf-comparacion-t">Comparación</h2></div><details><summary>Comparar con una revisión anterior</summary><Field label="Comparar con evaluación finalizada del mismo producto"><select value={previaId} onChange={async e => { const id = e.target.value; if (!leaveGuard.current || await leaveGuard.current()) setPreviaId(id); }}><option value="">Seleccionar evaluación anterior</option>{opciones.map(e => <option key={e.id} value={e.id}>{e.configuracion.nombre} · {e.configuracion.producto.version} · {new Date(e.finalizadoEn ?? e.updatedAt).toLocaleDateString()}</option>)}</select></Field>
      {compare.isLoading && <Skeleton etiqueta="Comprobando compatibilidad…" variante="texto" cantidad={2} />}{compare.error && <p role="alert" className="hf-error">{compare.error.message}</p>}
      {compare.data && opciones.find(e => e.id === previaId) && <ComparacionEditor key={previaId} actual={evaluacion} anterior={opciones.find(e => e.id === previaId)!} comparacion={compare.data} usuarioId={usuarioId} onSaved={onSaved} registerGuard={guard => { leaveGuard.current = guard; }} />}</details></section>}
    {pdfOpen && <InformePdfDialog informe={informe} busy={busy} error={pdfError} onClose={() => setPdfOpen(false)} onGenerate={async partes => {
      setBusy(true);
      setPdfError('');
      try {
        const { exportarInformeFlujoPdf } = await import('./informe-pdf');
        const { capturasFallidas } = await exportarInformeFlujoPdf(evaluacion.proyectoId, evaluacion, { partes, nombres });
        setPdfOpen(false);
        if (capturasFallidas) notify.error(`${capturasFallidas} captura${capturasFallidas === 1 ? '' : 's'} no se pudo cargar y quedó indicada en el PDF. Vuelve a generar el informe para reintentarlo.`);
      } catch (cause) {
        setPdfError(cause instanceof Error ? cause.message : 'No se pudo generar PDF');
      } finally {
        setBusy(false);
      }
    }} />}
  </>;
}
