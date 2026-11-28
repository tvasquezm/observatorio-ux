import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useOutletContext } from 'react-router-dom';
import { copiarMetodologia } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo, MetodologiaFlujo, MiembroEquipoFlujo } from '@observatorio-ux/shared-types';
import type { ProjectOutletContext } from '../../layouts/ProjectDetailLayout';
import { useAuthStore } from '../auth/store/useAuthStore';
import { useConfirm } from '../../shared/api/confirm';
import { TechniquePageHeader } from '../../shared/components/TechniquePageHeader';
import { TechniquePage } from '../../shared/components/TechniquePage';
import { TechniqueNewButton } from '../../shared/components/TechniqueNewButton';
import { TechniqueItemActions } from '../../shared/components/TechniqueItemActions';
import { TechniqueListHead, TechniqueEmpty } from '../../shared/components/TechniqueListParts';
import { Icon } from '../../shared/components/ui/Icon';
import { TechniqueProcess } from '../../shared/components/TechniqueProcess';
import { ConfiguracionEditor } from './ConfiguracionEditor';
import { ComentariosTecnica } from '../comments/components/ComentariosTecnica';
import { TrabajoEditor, SaveStatus } from './TrabajoEditor';
import { ConsensoEditor } from './ConsensoEditor';
import { InformeView } from './InformeView';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import { claveDeNombre, faltantesParaIniciar, guardarSesion, leerSesion } from './flujo-utils';
import { procesoHeuristica } from './heuristica-visual';
import { Skeleton } from '../../shared/components/ui/Skeleton';
import { notify } from '../../shared/api/toast';
import { useAvisosDeFase } from './useAvisosDeFase';
import { useActivePerspective } from '../../shared/auth/useActivePerspective';

/**
 * Respaldo por si no hay conexión de avisos (el servidor limita ~60 peticiones por minuto y por IP; muchos estudiantes comparten red).
 * Con los avisos activos la evaluación se actualiza sola cuando cambia de fase y solo se consulta de vez en cuando.
 */
const INTERVALO_SIN_AVISOS = 60_000;
const INTERVALO_CON_AVISOS = 10 * 60_000;
const ETAPA_FASE = { BORRADOR: 'Por preparar', EN_EVALUACION: 'En revisión', PENDIENTE_CONSENSO: 'Acuerdo del equipo', CONSOLIDADA: 'Informe preparado', FINALIZADA: 'Terminada' } as const;

function nuevaConfiguracion(m: MetodologiaFlujo, usuarioId: string): ConfiguracionFlujo {
  return { nombre: '', producto: { clave: '', nombre: '', version: '', url: '', dispositivo: '' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia: copiarMetodologia(m), evaluadorIds: [usuarioId], lectorIds: [] };
}
function PrepararRevision({ proyectoId, biblioteca, equipo, onSaved }: { proyectoId: string; biblioteca: MetodologiaFlujo[]; equipo: MiembroEquipoFlujo[]; onSaved: (e: EvaluacionFlujo) => void }) {
  const usuarioId = useAuthStore(s => s.user?.id ?? '');
  const key = `heuristica:nueva:${usuarioId}:${proyectoId}`;
  const initial = useRef(nuevaConfiguracion(biblioteca[0], usuarioId));
  const [value, setValue] = useState<ConfiguracionFlujo>(() => {
    try { const raw = sessionStorage.getItem(key); if (!raw) return initial.current; const parsed = JSON.parse(raw); return parsed && typeof parsed.nombre === 'string' && parsed.producto && parsed.metodologia?.criterios && parsed.metodologia?.escala?.niveles && Array.isArray(parsed.evaluadorIds) && Array.isArray(parsed.lectorIds) ? parsed as ConfiguracionFlujo : initial.current; } catch { return initial.current; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localError, setLocalError] = useState('');
  const dirty = JSON.stringify(value) !== JSON.stringify(initial.current);
  const confirm = useConfirm();
  const blocker = useBlocker(dirty || busy);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm('Tus datos se conservan en esta pestaña. ¿Salir de la revisión?').then(ok => { if (ok) blocker.proceed(); else blocker.reset(); });
  }, [blocker, confirm]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const listener = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, busy]);
  useEffect(() => { try { if (dirty) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key); setLocalError(''); } catch { setLocalError('No se pudo conservar lo escrito en esta pestaña. Comienza la revisión antes de cerrar.'); } }, [key, value, dirty]);
  return <form noValidate onSubmit={async e => {
    e.preventDefault(); setError('');
    const faltan = faltantesParaIniciar(value);
    if (faltan.length) { setError(`Para comenzar, completa: ${faltan.join(', ')}.`); const producto = e.currentTarget.querySelector<HTMLInputElement>('#hf-producto'); if (!producto?.value.trim()) producto?.focus(); return; }
    setBusy(true);
    try {
      const config = { ...value, nombre: value.nombre.trim() || value.producto.nombre.trim(), producto: { ...value.producto, clave: value.producto.clave.trim() || claveDeNombre(value.producto.nombre) || crypto.randomUUID() } };
      const result = await flujoRequest<EvaluacionFlujo>(proyectoId, '/evaluaciones/comenzar', 'POST', config);
      try { sessionStorage.removeItem(key); } catch { /* El navegador también bloqueó el guardado local. */ }
      onSaved(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo comenzar. Tus datos siguen aquí; vuelve a intentarlo.'); } finally { setBusy(false); }
  }}><fieldset disabled={busy} className="hf-sin-marco"><legend className="sr-only">Preparar revisión</legend><ConfiguracionEditor value={value} onChange={setValue} biblioteca={biblioteca} equipo={equipo} acciones={<button type="submit" className="primary">{busy ? 'Comenzando…' : 'Comenzar revisión'}</button>} /></fieldset>
    {localError && <p role="status">{localError}</p>}{error && <p role="alert" className="hf-error">{error}</p>}
  </form>;
}
function ConfiguracionSesion({ evaluacion, usuarioId, biblioteca, equipo, onSaved, onBack }: { evaluacion: EvaluacionFlujo; usuarioId: string; biblioteca: MetodologiaFlujo[]; equipo: MiembroEquipoFlujo[]; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void }) {
  const state = useFlujoDraft(evaluacion, usuarioId, 'configuracion', evaluacion.configuracion, onSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <><button type="button" className="secondary hf-volver" onClick={async () => { if (await state.confirmLeave()) onBack(); }}><span aria-hidden="true">←</span> Volver</button><h2>Continuar revisión guardada</h2>
    <form noValidate onSubmit={async e => {
      e.preventDefault(); setError(''); const faltan = faltantesParaIniciar(state.draft);
      if (faltan.length) { setError(`Para comenzar, completa: ${faltan.join(', ')}.`); const producto = e.currentTarget.querySelector<HTMLInputElement>('#hf-producto'); if (!producto?.value.trim()) producto?.focus(); return; }
      setBusy(true); try {
        await state.save();
        const config = { ...state.draft, nombre: state.draft.nombre.trim() || state.draft.producto.nombre.trim(), producto: { ...state.draft.producto, clave: state.draft.producto.clave.trim() || claveDeNombre(state.draft.producto.nombre) || crypto.randomUUID() } };
        let revision = state.getRevision();
        if (config.nombre !== state.draft.nombre || config.producto.clave !== state.draft.producto.clave) {
          const normalizada = await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/configuracion`, 'PATCH', { revision, configuracion: config });
          revision = normalizada.revision; onSaved(normalizada);
        }
        onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/iniciar`, 'POST', { revision }));
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo comenzar. Vuelve a intentarlo.'); } finally { setBusy(false); }
    }}><fieldset disabled={busy} className="hf-sin-marco"><legend className="sr-only">Datos de la revisión</legend><ConfiguracionEditor value={state.draft} onChange={state.setDraft} biblioteca={biblioteca} equipo={equipo} acciones={<><SaveStatus {...state} /><button type="submit" className="primary" disabled={busy || state.saving}>Comenzar revisión</button></>} /></fieldset></form>{error && <p role="alert" className="hf-error">{error}</p>}
  </>;
}
/** Vista del docente mientras el equipo trabaja: ve cómo va, sin entrar a los formularios de los estudiantes. */
function SoloConsulta({ evaluacion, onBack }: { evaluacion: EvaluacionFlujo; onBack: () => void }) {
  const avance = evaluacion.avanceEquipo ?? [];
  return <>
    <button type="button" className="secondary hf-volver" onClick={onBack}><span aria-hidden="true">←</span> Volver</button>
    <section className="panel" aria-labelledby="hf-consulta-titulo">
      <h2 id="hf-consulta-titulo">{evaluacion.configuracion.nombre || evaluacion.configuracion.producto.nombre}</h2>
      <p role="note">Como docente solo consultas esta técnica: la revisión y el acuerdo los trabajan los estudiantes. El informe estará disponible aquí cuando el equipo lo consolide.</p>
      {avance.length > 0 && <ul className="hf-consulta-avance" aria-label="Avance del equipo">{avance.map(t => <li key={t.evaluadorId}><strong>{t.nombre}</strong> · {t.entregadoEn ? 'Entregó su revisión' : t.evaluados > 0 ? `${t.evaluados} de ${t.total} preguntas` : 'Aún no empieza'}</li>)}</ul>}
    </section>
  </>;
}

export function FlujoHeuristicaPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const usuarioId = useAuthStore(s => s.user?.id ?? '');
  const client = useQueryClient();
  const claveSel = `heuristica:sel:${usuarioId}:${proyectoId}`;
  const [selected, setSeleccionado] = useState<string | null>(() => leerSesion(claveSel));
  const [nueva, setNueva] = useState(false);
  // El docente consulta las evaluaciones y sus informes; crearlas y trabajarlas lo hacen los estudiantes.
  const soloLectura = useActivePerspective() === 'DOCENTE';
  const setSelected = (id: string | null) => { setSeleccionado(id); setNueva(false); guardarSesion(claveSel, id); };
  const [producto, setProducto] = useState('');
  useEffect(() => { setSeleccionado(leerSesion(claveSel)); }, [claveSel]);
  const key = ['heuristica-flujo', proyectoId, usuarioId];
  const history = useQuery({ queryKey: [...key, 'evaluaciones'], queryFn: () => flujoRequest<EvaluacionFlujo[]>(proyectoId, '/evaluaciones') });
  const library = useQuery({ queryKey: [...key, 'metodologias'], queryFn: () => flujoRequest<MetodologiaFlujo[]>(proyectoId, '/metodologias') });
  const team = useQuery({ queryKey: [...key, 'equipo'], queryFn: () => flujoRequest<MiembroEquipoFlujo[]>(proyectoId, '/equipo') });
  const [avisosActivos, setAvisosActivos] = useState(false);
  const active = useQuery({ queryKey: [...key, 'evaluacion', selected], queryFn: () => flujoRequest<EvaluacionFlujo>(proyectoId, `/evaluaciones/${selected}`), enabled: !!selected, refetchOnWindowFocus: true,
    // Otras personas avanzan la evaluación: se consulta sola mientras la pestaña está a la vista, solo mientras otras personas pueden avanzarla (revisión y acuerdo).
    refetchInterval: (q) => (q.state.data && ['EN_EVALUACION', 'PENDIENTE_CONSENSO'].includes(q.state.data.fase) ? (avisosActivos ? INTERVALO_CON_AVISOS : INTERVALO_SIN_AVISOS) : false), refetchIntervalInBackground: false });
  function saved(e: EvaluacionFlujo) {
    client.setQueryData([...key, 'evaluacion', e.id], e);
    void client.invalidateQueries({ queryKey: [...key, 'evaluaciones'] });
    setSelected(e.id);
  }
  const evaluacion = active.data;
  const conectado = useAvisosDeFase(proyectoId, selected, (tipo) => { void active.refetch(); if (tipo === 'fase') void client.invalidateQueries({ queryKey: [...key, 'evaluaciones'] }); });
  useEffect(() => { setAvisosActivos(conectado); }, [conectado]);
  // Aviso cuando la evaluación pasa a otra fase mientras se está mirando (por ella misma o por otra persona).
  const faseVista = useRef<{ id: string; fase: EvaluacionFlujo['fase'] } | null>(null);
  useEffect(() => {
    if (!evaluacion) { faseVista.current = null; return; }
    const antes = faseVista.current;
    if (antes && antes.id === evaluacion.id && antes.fase !== evaluacion.fase) notify.info(`La evaluación avanzó: ahora está en «${ETAPA_FASE[evaluacion.fase]}».`);
    faseVista.current = { id: evaluacion.id, fase: evaluacion.fase };
  }, [evaluacion?.id, evaluacion?.fase]);
  const pendiente = [...(history.data ?? [])].filter(e => e.fase !== 'FINALIZADA').sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  const etapaPendiente = { BORRADOR: 'por preparar', EN_EVALUACION: 'en revisión', PENDIENTE_CONSENSO: 'en acuerdo del equipo', CONSOLIDADA: 'con informe por finalizar', FINALIZADA: 'terminada' } as const;
  const back = () => setSelected(null);
  let content;
  if (selected && active.isLoading) content = <Skeleton etiqueta="Cargando evaluación…" cantidad={5} />;
  else if (selected && active.error) content = <><button type="button" className="secondary hf-volver" onClick={back}><span aria-hidden="true">←</span> Volver</button><p role="alert" className="hf-error">{active.error.message}</p><button type="button" className="secondary" onClick={() => void active.refetch()}>Reintentar</button></>;
  else if (evaluacion && selected) {
    const common = { evaluacion, usuarioId, onSaved: saved, onBack: back };
    if (soloLectura && ['BORRADOR', 'EN_EVALUACION', 'PENDIENTE_CONSENSO'].includes(evaluacion.fase)) content = <SoloConsulta evaluacion={evaluacion} onBack={back} />;
    else if (evaluacion.fase === 'BORRADOR') content = evaluacion.coordinadorId === usuarioId && library.data && team.data ? <ConfiguracionSesion key={`${evaluacion.id}:configuracion`} {...common} biblioteca={library.data} equipo={team.data} /> : <><button type="button" className="secondary hf-volver" onClick={back}><span aria-hidden="true">←</span> Volver</button><p>El coordinador está configurando la evaluación.</p></>;
    else if (evaluacion.fase === 'EN_EVALUACION') content = <TrabajoEditor key={`${evaluacion.id}:trabajo`} {...common} />;
    else if (evaluacion.fase === 'PENDIENTE_CONSENSO') content = evaluacion.coordinadorId === usuarioId || evaluacion.configuracion.evaluadorIds.includes(usuarioId) ? <ConsensoEditor key={`${evaluacion.id}:consenso`} {...common} equipo={team.data} /> : <><button type="button" className="secondary hf-volver" onClick={back}><span aria-hidden="true">←</span> Volver</button><p>El equipo está acordando el consenso. El informe estará disponible al consolidar.</p></>;
    else content = <InformeView key={`${evaluacion.id}:informe`} {...common} historial={history.data ?? []} equipo={team.data} soloLectura={soloLectura} />;
  } else content = null;
  const avisos = <>
    {[history.error, library.error, team.error].filter(Boolean).map((e, i) => <p role="alert" className="hf-error" key={i}>{e?.message}</p>)}
    {(library.isLoading || team.isLoading) && <Skeleton etiqueta="Cargando preguntas y personas…" variante="lista" cantidad={2} />}
  </>;
  const revisiones = (history.data ?? []).filter(e => `${e.configuracion.producto.nombre} ${e.configuracion.nombre}`.toLocaleLowerCase().includes(producto.toLocaleLowerCase()));
  const etapa = { BORRADOR: 'Por preparar', EN_EVALUACION: 'En revisión', PENDIENTE_CONSENSO: 'Acuerdo del equipo', CONSOLIDADA: 'Informe preparado', FINALIZADA: 'Terminada' } as const;
  const instrucciones = ['Indica el producto o sitio que vas a revisar y elige una metodología.', 'Responde cada pregunta y anota los problemas que veas, con una captura si ayuda.', 'Entrega tu revisión. Si trabajan en equipo, acuerden las respuestas juntos.', 'Prepara el informe y descárgalo en PDF.'];
  return <TechniquePage
    className="hf fade"
    cabecera={!selected && <TechniquePageHeader label="TÉCNICA DE INVESTIGACIÓN" title="Evaluación heurística" description="Revisa un producto con una metodología conocida, una pregunta a la vez." instructions={instrucciones}
      action={<TechniqueNewButton etiqueta="+ Nueva evaluación" abierto={nueva} puedeEditar={!soloLectura} onClick={() => setNueva(v => !v)} />} />}
    proceso={(!selected || evaluacion) && <>
      <TechniqueProcess title="Proceso de la evaluación" compact={!!selected} steps={procesoHeuristica(selected && evaluacion ? evaluacion.fase : null)} />
      {selected && evaluacion && <div className="hf-proceso-estado"><span>Etapa actual: <strong>{ETAPA_FASE[evaluacion.fase]}</strong>. {avisosActivos ? 'Se actualiza sola cuando alguien avanza la fase o el equipo entrega, vota o confirma.' : 'Se actualiza sola cada minuto.'}</span>
        <button type="button" className="secondary" disabled={active.isFetching} onClick={() => void active.refetch()}>{active.isFetching ? 'Actualizando…' : 'Actualizar proceso'}</button></div>}
    </>}
    formulario={selected ? content : nueva && !soloLectura && <>
      {avisos}
      {library.data?.length && team.data ? <PrepararRevision key={proyectoId} proyectoId={proyectoId} biblioteca={library.data} equipo={team.data} onSaved={saved} /> : null}
    </>}
    lista={!selected && !nueva && <>
      {pendiente && <div className="hf-retomar panel" role="region" aria-label="Revisión sin terminar">{pendiente.coordinadorId === usuarioId ? <p>Tienes una revisión sin terminar: <strong>{pendiente.configuracion.nombre || pendiente.configuracion.producto.nombre}</strong> ({etapaPendiente[pendiente.fase]}).</p> : <p>Hay una revisión sin terminar creada por {team.data?.find(m => m.id === pendiente.coordinadorId)?.nombre ?? 'otra persona del equipo'}: <strong>{pendiente.configuracion.nombre || pendiente.configuracion.producto.nombre}</strong> ({etapaPendiente[pendiente.fase]}).</p>}<button type="button" className="secondary" onClick={() => setSelected(pendiente.id)}>Retomar mi última revisión</button></div>}
      {avisos}
      {history.data && history.data.length > 0 && <>
        <TechniqueListHead titulo="Mis revisiones" cantidad={history.data.length} />
        <label className="field">Buscar producto<input value={producto} onChange={e => setProducto(e.target.value)} /></label>
        <div className="hf-revisiones">{revisiones.map(e => {
          const titulo = e.configuracion.nombre || e.configuracion.producto.nombre;
          return <div key={e.id} className="hf-revision-row" role="group" aria-label={titulo}>
            <span><strong>{titulo}</strong><small>{etapa[e.fase]}</small></span>
            <TechniqueItemActions etiquetaConsultar={e.fase === 'CONSOLIDADA' || e.fase === 'FINALIZADA' ? 'Abrir informe' : 'Abrir'} onConsultar={() => setSelected(e.id)} />
          </div>;
        })}</div>
      </>}
      {history.data?.length === 0 && <TechniqueEmpty icono={<Icon name="heuristica" size={28} />} titulo="Aún no hay revisiones guardadas" texto="Usa + Nueva evaluación para comenzar la primera revisión del producto." />}
    </>}
    comentarios={<ComentariosTecnica proyectoId={proyectoId} tecnica="evaluacion-heuristica" />}
  />;
}
