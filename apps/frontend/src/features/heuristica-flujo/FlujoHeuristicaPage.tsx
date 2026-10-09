import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker, useOutletContext, useSearchParams } from 'react-router-dom';
import { copiarMetodologia } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo, MetodologiaFlujo, MiembroEquipoFlujo } from '@observatorio-ux/shared-types';
import type { ProjectOutletContext } from '../../layouts/ProjectDetailLayout';
import { useAuthStore } from '../auth/store/useAuthStore';
import { useConfirm } from '../../shared/api/confirm';
import { ConfiguracionEditor } from './ConfiguracionEditor';
import { TrabajoEditor, SaveStatus } from './TrabajoEditor';
import { ConsensoEditor } from './ConsensoEditor';
import { InformeView } from './InformeView';
import { useFlujoDraft } from './useFlujoDraft';
import { flujoRequest } from './flujo.api';
import './flujo.css';

function nuevaConfiguracion(m: MetodologiaFlujo): ConfiguracionFlujo {
  return { nombre: '', producto: { clave: '', nombre: '', version: '', url: '', dispositivo: '' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia: copiarMetodologia(m), evaluadorIds: [], lectorIds: [] };
}
function NuevaEvaluacion({ proyectoId, biblioteca, equipo, onSaved, onCancel, onSaveMethod }: { proyectoId: string; biblioteca: MetodologiaFlujo[]; equipo: MiembroEquipoFlujo[]; onSaved: (e: EvaluacionFlujo) => void; onCancel: () => void; onSaveMethod: (m: MetodologiaFlujo) => Promise<void> }) {
  const usuarioId = useAuthStore(s => s.user?.id ?? '');
  const key = `heuristica:nueva:${usuarioId}:${proyectoId}`;
  const initial = useRef(nuevaConfiguracion(biblioteca[0]));
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
    void confirm('El borrador nuevo se conserva en esta pestaña. ¿Salir de la pantalla?').then(ok => { if (ok) blocker.proceed(); else blocker.reset(); });
  }, [blocker, confirm]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const listener = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, busy]);
  useEffect(() => { try { if (dirty) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key); setLocalError(''); } catch { setLocalError('No se pudo conservar el borrador local. Guarda antes de cerrar.'); } }, [key, value, dirty]);
  const clearDraft = () => { try { sessionStorage.removeItem(key); } catch { /* El navegador también bloqueó el guardado local. */ } };
  return <><button type="button" className="text-button" disabled={busy} onClick={async () => { if (dirty && !(await confirm('¿Cancelar y descartar el borrador nuevo?'))) return; clearDraft(); onCancel(); }}>← Cancelar nueva evaluación</button>
    <p role="status">{localError || (dirty ? 'Borrador local conservado en esta pestaña; se recupera al retomar Nueva evaluación.' : 'Completa la configuración para guardar el borrador.')}</p>
    <h2>Nueva evaluación heurística</h2><ConfiguracionEditor value={value} onChange={setValue} biblioteca={biblioteca} equipo={equipo} onSaveMethod={onSaveMethod} />
    <button type="button" className="primary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const result = await flujoRequest<EvaluacionFlujo>(proyectoId, '/evaluaciones', 'POST', value); clearDraft(); onSaved(result); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear'); } finally { setBusy(false); } }}>Guardar borrador de evaluación</button>{error && <p role="alert" className="hf-error">{error}</p>}
  </>;
}
function ConfiguracionSesion({ evaluacion, usuarioId, biblioteca, equipo, onSaved, onBack, onSaveMethod }: { evaluacion: EvaluacionFlujo; usuarioId: string; biblioteca: MetodologiaFlujo[]; equipo: MiembroEquipoFlujo[]; onSaved: (e: EvaluacionFlujo) => void; onBack: () => void; onSaveMethod: (m: MetodologiaFlujo) => Promise<void> }) {
  const state = useFlujoDraft(evaluacion, usuarioId, 'configuracion', evaluacion.configuracion, onSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <><button type="button" className="text-button" onClick={async () => { if (await state.confirmLeave()) onBack(); }}>← Evaluaciones</button><div className="page-head"><div><h2>{state.draft.nombre || 'Borrador de evaluación'}</h2><p>Configura el alcance antes de iniciar. Iniciar fija una copia versionada del método y la escala.</p></div><span className="badge">BORRADOR</span></div>
    <SaveStatus {...state} /><fieldset disabled={busy}><legend>Configuración del borrador</legend><ConfiguracionEditor value={state.draft} onChange={state.setDraft} biblioteca={biblioteca} equipo={equipo} onSaveMethod={onSaveMethod} /></fieldset><SaveStatus {...state} />
    <button type="button" className="primary" disabled={busy || state.saving} onClick={async () => { setBusy(true); setError(''); try { await state.save(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/iniciar`, 'POST', { revision: state.getRevision() })); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar'); } finally { setBusy(false); } }}>Iniciar con configuración fija</button>{error && <p role="alert" className="hf-error">{error}</p>}
  </>;
}
export function FlujoHeuristicaPage() {
  const { proyectoId } = useOutletContext<ProjectOutletContext>();
  const usuarioId = useAuthStore(s => s.user?.id ?? '');
  const [, setSearch] = useSearchParams();
  const client = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [producto, setProducto] = useState('');
  useEffect(() => { setSelected(null); setCreating(false); }, [proyectoId, usuarioId]);
  const key = ['heuristica-flujo', proyectoId, usuarioId];
  const history = useQuery({ queryKey: [...key, 'evaluaciones'], queryFn: () => flujoRequest<EvaluacionFlujo[]>(proyectoId, '/evaluaciones') });
  const library = useQuery({ queryKey: [...key, 'metodologias'], queryFn: () => flujoRequest<MetodologiaFlujo[]>(proyectoId, '/metodologias') });
  const team = useQuery({ queryKey: [...key, 'equipo'], queryFn: () => flujoRequest<MiembroEquipoFlujo[]>(proyectoId, '/equipo') });
  const active = useQuery({ queryKey: [...key, 'evaluacion', selected], queryFn: () => flujoRequest<EvaluacionFlujo>(proyectoId, `/evaluaciones/${selected}`), enabled: !!selected, refetchOnWindowFocus: false });
  function saved(e: EvaluacionFlujo) {
    client.setQueryData([...key, 'evaluacion', e.id], e);
    void client.invalidateQueries({ queryKey: [...key, 'evaluaciones'] });
    setSelected(e.id); setCreating(false);
  }
  async function saveMethod(m: MetodologiaFlujo) {
    await flujoRequest<MetodologiaFlujo>(proyectoId, '/metodologias', 'POST', m);
    await client.invalidateQueries({ queryKey: [...key, 'metodologias'] });
  }
  const evaluacion = active.data;
  const back = () => setSelected(null);
  let content;
  if (creating && library.data?.length && team.data) content = <NuevaEvaluacion key={proyectoId} proyectoId={proyectoId} biblioteca={library.data} equipo={team.data} onSaved={saved} onCancel={() => setCreating(false)} onSaveMethod={saveMethod} />;
  else if (selected && active.isLoading) content = <p role="status">Cargando evaluación…</p>;
  else if (selected && active.error) content = <><button type="button" onClick={back}>← Evaluaciones</button><p role="alert" className="hf-error">{active.error.message}</p><button type="button" onClick={() => void active.refetch()}>Reintentar</button></>;
  else if (evaluacion && selected) {
    const common = { evaluacion, usuarioId, onSaved: saved, onBack: back };
    if (evaluacion.fase === 'BORRADOR') content = evaluacion.coordinadorId === usuarioId && library.data && team.data ? <ConfiguracionSesion key={`${evaluacion.id}:configuracion`} {...common} biblioteca={library.data} equipo={team.data} onSaveMethod={saveMethod} /> : <><button type="button" onClick={back}>← Evaluaciones</button><p>El coordinador está configurando la evaluación.</p></>;
    else if (evaluacion.fase === 'EN_EVALUACION') content = <TrabajoEditor key={`${evaluacion.id}:trabajo`} {...common} />;
    else if (evaluacion.fase === 'PENDIENTE_CONSENSO') content = evaluacion.coordinadorId === usuarioId || evaluacion.configuracion.evaluadorIds.includes(usuarioId) ? <ConsensoEditor key={`${evaluacion.id}:consenso`} {...common} /> : <><button type="button" onClick={back}>← Evaluaciones</button><p>El equipo está acordando el consenso. El informe estará disponible al consolidar.</p></>;
    else content = <InformeView key={`${evaluacion.id}:informe`} {...common} historial={history.data ?? []} />;
  } else content = <>
    <div className="page-head"><div><h2>Evaluación heurística</h2><p>Define el producto y alcance, reúne valoraciones independientes y acuerda un informe reproducible.</p></div></div>
    <div className="hf-actions"><button type="button" className="primary" disabled={!library.data?.length || !team.data} onClick={() => setCreating(true)}>Nueva evaluación completa</button><button type="button" onClick={() => setSearch({ anteriores: '1' })}>Evaluaciones anteriores (sesiones)</button></div>
    {[history.error, library.error, team.error].filter(Boolean).map((e, i) => <p role="alert" className="hf-error" key={i}>{e?.message}</p>)}
    {(history.isLoading || library.isLoading || team.isLoading) && <p role="status">Cargando biblioteca, equipo e historial…</p>}
    <section className="panel"><div className="panel-head"><h2>Historial por producto y alcance</h2></div><label className="field">Filtrar producto<input value={producto} onChange={e => setProducto(e.target.value)} /></label>
      <div className="hf-table"><table><thead><tr><th>Evaluación / producto</th><th>Alcance / versión</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{(history.data ?? []).filter(e => `${e.configuracion.producto.nombre} ${e.configuracion.producto.clave}`.toLocaleLowerCase().includes(producto.toLocaleLowerCase())).map(e => <tr key={e.id}><td>{e.configuracion.nombre}<br />{e.configuracion.producto.nombre} · {e.configuracion.producto.clave}</td><td>{e.configuracion.pantallas}<br />{e.configuracion.producto.version} · revisión {e.version}</td><td>{e.fase}</td><td><button type="button" onClick={() => setSelected(e.id)}>Abrir {e.configuracion.nombre || 'borrador'}</button></td></tr>)}</tbody></table></div>{history.data?.length === 0 && <p>Todavía no hay evaluaciones del nuevo flujo.</p>}
    </section>
  </>;
  return <div className="hf fade">{content}</div>;
}
