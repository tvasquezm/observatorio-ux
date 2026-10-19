import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useOutletContext, useSearchParams } from 'react-router-dom';
import { copiarMetodologia } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo, MetodologiaFlujo, MiembroEquipoFlujo } from '@observatorio-ux/shared-types';
import type { ProjectOutletContext } from '../../layouts/ProjectDetailLayout';
import { useAuthStore } from '../auth/store/useAuthStore';
import { useConfirm } from '../../shared/api/confirm';
import { TechniquePageHeader } from '../../shared/components/TechniquePageHeader';
import { TechniqueProcess } from '../../shared/components/TechniqueProcess';
import { ConfiguracionEditor } from './ConfiguracionEditor';
import { TrabajoEditor, SaveStatus } from './TrabajoEditor';
import { ConsensoEditor } from './ConsensoEditor';
import { InformeView } from './InformeView';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import { claveDeNombre, faltantesParaIniciar } from './flujo-utils';
import { procesoHeuristica } from './heuristica-visual';

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
  return <><button type="button" className="secondary" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>← Mis revisiones</button><h2>Continuar revisión guardada</h2>
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
export function FlujoHeuristicaPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const usuarioId = useAuthStore(s => s.user?.id ?? '');
  const [, setSearch] = useSearchParams();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [producto, setProducto] = useState('');
  useEffect(() => { setSelected(null); }, [proyectoId, usuarioId]);
  const key = ['heuristica-flujo', proyectoId, usuarioId];
  const history = useQuery({ queryKey: [...key, 'evaluaciones'], queryFn: () => flujoRequest<EvaluacionFlujo[]>(proyectoId, '/evaluaciones') });
  const library = useQuery({ queryKey: [...key, 'metodologias'], queryFn: () => flujoRequest<MetodologiaFlujo[]>(proyectoId, '/metodologias') });
  const team = useQuery({ queryKey: [...key, 'equipo'], queryFn: () => flujoRequest<MiembroEquipoFlujo[]>(proyectoId, '/equipo') });
  const active = useQuery({ queryKey: [...key, 'evaluacion', selected], queryFn: () => flujoRequest<EvaluacionFlujo>(proyectoId, `/evaluaciones/${selected}`), enabled: !!selected, refetchOnWindowFocus: false });
  function saved(e: EvaluacionFlujo) {
    client.setQueryData([...key, 'evaluacion', e.id], e);
    void client.invalidateQueries({ queryKey: [...key, 'evaluaciones'] });
    setSelected(e.id);
  }
  const evaluacion = active.data;
  const back = () => setSelected(null);
  let content;
  if (selected && active.isLoading) content = <p role="status">Cargando evaluación…</p>;
  else if (selected && active.error) content = <><button type="button" className="secondary" onClick={back}>← Evaluaciones</button><p role="alert" className="hf-error">{active.error.message}</p><button type="button" className="secondary" onClick={() => void active.refetch()}>Reintentar</button></>;
  else if (evaluacion && selected) {
    const common = { evaluacion, usuarioId, onSaved: saved, onBack: back };
    if (evaluacion.fase === 'BORRADOR') content = evaluacion.coordinadorId === usuarioId && library.data && team.data ? <ConfiguracionSesion key={`${evaluacion.id}:configuracion`} {...common} biblioteca={library.data} equipo={team.data} /> : <><button type="button" className="secondary" onClick={back}>← Evaluaciones</button><p>El coordinador está configurando la evaluación.</p></>;
    else if (evaluacion.fase === 'EN_EVALUACION') content = <TrabajoEditor key={`${evaluacion.id}:trabajo`} {...common} />;
    else if (evaluacion.fase === 'PENDIENTE_CONSENSO') content = evaluacion.coordinadorId === usuarioId || evaluacion.configuracion.evaluadorIds.includes(usuarioId) ? <ConsensoEditor key={`${evaluacion.id}:consenso`} {...common} /> : <><button type="button" className="secondary" onClick={back}>← Evaluaciones</button><p>El equipo está acordando el consenso. El informe estará disponible al consolidar.</p></>;
    else content = <InformeView key={`${evaluacion.id}:informe`} {...common} historial={history.data ?? []} />;
  } else content = <>
    {[history.error, library.error, team.error].filter(Boolean).map((e, i) => <p role="alert" className="hf-error" key={i}>{e?.message}</p>)}
    {(library.isLoading || team.isLoading) && <p role="status">Cargando preguntas y personas…</p>}
    {library.data?.length && team.data ? <PrepararRevision key={proyectoId} proyectoId={proyectoId} biblioteca={library.data} equipo={team.data} onSaved={saved} /> : null}
    <details className="panel"><summary>Mis revisiones · {history.data?.length ?? 0}</summary>
      <label className="field">Buscar producto<input value={producto} onChange={e => setProducto(e.target.value)} /></label>
      <div className="hf-table"><table><thead><tr><th>Revisión</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{(history.data ?? []).filter(e => `${e.configuracion.producto.nombre} ${e.configuracion.nombre}`.toLocaleLowerCase().includes(producto.toLocaleLowerCase())).map(e => <tr key={e.id}><td>{e.configuracion.nombre || e.configuracion.producto.nombre}</td><td>{({ BORRADOR: 'Por preparar', EN_EVALUACION: 'En revisión', PENDIENTE_CONSENSO: 'Acuerdo del equipo', CONSOLIDADA: 'Informe preparado', FINALIZADA: 'Terminada' })[e.fase]}</td><td><button type="button" className="secondary" onClick={() => setSelected(e.id)}>Abrir {e.configuracion.nombre || 'revisión'}</button></td></tr>)}</tbody></table></div>
      {history.data?.length === 0 && <p>Aún no hay revisiones guardadas.</p>}
      <button type="button" className="secondary" onClick={() => setSearch({ anteriores: '1' })}>Evaluaciones anteriores (sesiones)</button>
    </details>
  </>;
  const instrucciones = ['Indica el producto o sitio que vas a revisar y elige una metodología.', 'Responde cada pregunta y anota los problemas que veas, con una captura si ayuda.', 'Entrega tu revisión. Si trabajan en equipo, acuerden las respuestas juntos.', 'Prepara el informe y descárgalo en PDF.'];
  return <div className="artifact-page hf fade">
    {!selected && <TechniquePageHeader label="TÉCNICA DE INVESTIGACIÓN" title="Evaluación heurística" description="Revisa un producto con una metodología conocida, una pregunta a la vez." instructions={instrucciones} />}
    {(!selected || evaluacion) && <TechniqueProcess title="Proceso de la evaluación" compact={!!selected} steps={procesoHeuristica(selected && evaluacion ? evaluacion.fase : null)} />}
    {content}
  </div>;
}
