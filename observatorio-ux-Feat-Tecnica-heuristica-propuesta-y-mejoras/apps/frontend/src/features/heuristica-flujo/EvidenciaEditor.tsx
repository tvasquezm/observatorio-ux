import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AnotacionEvidencia, EvidenciaFlujo } from '@observatorio-ux/shared-types';
import { useAuthStore } from '../auth/store/useAuthStore';
import { validarArchivoEvidencia } from '../evaluacion-heuristica/heuristica-utils';
import { cargarEvidencia, guardarAnotaciones, subirEvidenciaFlujo } from './evidencia.api';

interface Props {
  proyectoId: string; evaluacionId: string; evidenciaIds: string[]; editable: boolean;
  onChange?: (ids: string[]) => void;
  onPendingChange?: (pending: boolean) => void;
}
const TIPOS = { rectangulo: 'Rectángulo', circulo: 'Círculo', flecha: 'Flecha', destacado: 'Destacado', texto: 'Texto' } as const;
const vacia = (): AnotacionEvidencia => ({ id: crypto.randomUUID(), tipo: 'rectangulo', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, color: '#d83232', texto: '' });
const mensaje = (e: unknown) => e instanceof Error ? e.message : 'No se pudo guardar la captura.';

function Marca({ anotacion: a }: { anotacion: AnotacionEvidencia }) {
  const marker = useId().replace(/:/g, '');
  const x = Math.min(a.x, a.x2) * 1000, y = Math.min(a.y, a.y2) * 1000;
  const w = Math.abs(a.x2 - a.x) * 1000, h = Math.abs(a.y2 - a.y) * 1000;
  if (a.tipo === 'texto') return <text x={a.x * 1000} y={a.y * 1000} fill={a.color} fontSize="25">{a.texto}</text>;
  if (a.tipo === 'circulo') return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} stroke={a.color} strokeWidth="5" fill="none" />;
  if (a.tipo === 'flecha') return <g><defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill={a.color} /></marker></defs><line x1={a.x * 1000} y1={a.y * 1000} x2={a.x2 * 1000} y2={a.y2 * 1000} stroke={a.color} strokeWidth="5" markerEnd={`url(#${marker})`} /></g>;
  return <rect x={x} y={y} width={w} height={h} stroke={a.tipo === 'destacado' ? 'none' : a.color} strokeWidth="5" fill={a.tipo === 'destacado' ? a.color : 'none'} fillOpacity="0.3" />;
}

function Lienzo({ proyectoId, evaluacionId, meta, blob, editable, onPendingChange }: Omit<Props, 'evidenciaIds' | 'onChange'> & { meta: EvidenciaFlujo; blob: Blob }) {
  const qc = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const [url, setUrl] = useState('');
  const [anotaciones, setAnotaciones] = useState<AnotacionEvidencia[]>(() => meta.anotaciones ?? []);
  const [guardadas, setGuardadas] = useState(() => JSON.stringify(meta.anotaciones ?? []));
  const [revision, setRevision] = useState(meta.revision);
  const [historial, setHistorial] = useState<AnotacionEvidencia[][]>([]);
  const [borrador, setBorrador] = useState(vacia);
  const [editando, setEditando] = useState<string | null>(null);
  const [original, setOriginal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<AnotacionEvidencia | null>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const pendingRef = useRef(onPendingChange); pendingRef.current = onPendingChange;
  const dirty = JSON.stringify(anotaciones) !== guardadas;
  useEffect(() => {
    if (dirty || guardando) return;
    setAnotaciones(meta.anotaciones); setGuardadas(JSON.stringify(meta.anotaciones)); setRevision(meta.revision); setHistorial([]);
  }, [meta, dirty, guardando]);
  useEffect(() => { const value = URL.createObjectURL(blob); setUrl(value); return () => URL.revokeObjectURL(value); }, [blob]);
  useEffect(() => { pendingRef.current?.(dirty || guardando); }, [dirty, guardando]);
  useEffect(() => () => pendingRef.current?.(false), []);
  useEffect(() => {
    if (!dirty) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso); return () => window.removeEventListener('beforeunload', aviso);
  }, [dirty]);
  function cambiar(next: AnotacionEvidencia[]) { setHistorial(h => [...h.slice(-49), anotaciones]); setAnotaciones(next); setEstado(''); }
  function agregar(a = borrador) {
    if (guardando || (a.tipo === 'texto' && !a.texto.trim())) { setError('Escribe el texto de la anotación.'); return; }
    if (!editando && anotaciones.length >= 50) { setError('Máximo 50 anotaciones por captura.'); return; }
    cambiar(editando ? anotaciones.map(n => n.id === editando ? { ...a, id: editando } : n) : [...anotaciones, { ...a, id: crypto.randomUUID() }]);
    setEditando(null); setBorrador(vacia()); setError('');
  }
  async function guardar() {
    setGuardando(true); setError('');
    try { const nuevaMeta = await guardarAnotaciones(proyectoId, evaluacionId, meta.id, anotaciones, revision); qc.setQueryData(['flujo-evidencia', proyectoId, evaluacionId, meta.id, userId], { meta: nuevaMeta, blob }); setGuardadas(JSON.stringify(anotaciones)); setRevision(nuevaMeta.revision); setEstado('Anotaciones guardadas.'); }
    catch (e) { setError(mensaje(e)); } finally { setGuardando(false); }
  }
  async function recuperar() {
    if (!window.confirm('Se reemplazarán tus anotaciones pendientes por las guardadas. ¿Continuar?')) return;
    setGuardando(true);
    try { const data = await cargarEvidencia(proyectoId, evaluacionId, meta.id); qc.setQueryData(['flujo-evidencia', proyectoId, evaluacionId, meta.id, userId], data); setAnotaciones(data.meta.anotaciones); setGuardadas(JSON.stringify(data.meta.anotaciones)); setRevision(data.meta.revision); setHistorial([]); setError(''); setEstado('Anotaciones guardadas recuperadas.'); }
    catch (e) { setError(mensaje(e)); } finally { setGuardando(false); }
  }
  function punto(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  }
  return <section className="panel" aria-label="Editor de captura">
    <label className="field"><input type="checkbox" checked={original} onChange={e => setOriginal(e.target.checked)} /> Mostrar imagen original</label>
    <div style={{ position: 'relative', width: '100%', maxWidth: 720, marginBlock: 12 }}>
      <img src={url} alt="Captura de evidencia" style={{ display: 'block', width: '100%', height: 'auto' }} />
      {!original && <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Vista de las anotaciones" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: editable ? 'none' : 'auto', cursor: editable ? 'crosshair' : 'default' }}
        onPointerDown={e => { if (!editable || guardando) return; inicio.current = punto(e); e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (!inicio.current) return; const p = punto(e); setPreview({ ...borrador, ...inicio.current, x2: p.x, y2: p.y }); }}
        onPointerUp={e => { if (!inicio.current) return; const p = punto(e); const a = { ...borrador, ...inicio.current, x2: p.x, y2: p.y }; inicio.current = null; setPreview(null); agregar(a); }}
        onPointerCancel={() => { inicio.current = null; setPreview(null); }}>
        {anotaciones.map(a => <Marca key={a.id} anotacion={a} />)}{preview && <Marca anotacion={preview} />}
      </svg>}
    </div>
    {editable && <fieldset disabled={guardando} style={{ border: 0, padding: 0 }}>
      <legend>Agregar o editar anotaciones</legend>
      <p className="text-muted-xs">Dibuja sobre la captura o usa los campos de posición para trabajar con teclado. El original se conserva.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <label className="field">Herramienta<select className="input-sm" value={borrador.tipo} onChange={e => setBorrador({ ...borrador, tipo: e.target.value as AnotacionEvidencia['tipo'] })}>{Object.entries(TIPOS).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select></label>
        <label className="field">Color<input type="color" value={borrador.color} onChange={e => setBorrador({ ...borrador, color: e.target.value })} /></label>
        {(['x', 'y', 'x2', 'y2'] as const).map(k => <label className="field" key={k}>{({ x: 'Inicio horizontal (%)', y: 'Inicio vertical (%)', x2: 'Fin horizontal (%)', y2: 'Fin vertical (%)' })[k]}<input className="input-sm" type="number" min="0" max="100" step="1" value={Math.round(borrador[k] * 100)} onChange={e => setBorrador({ ...borrador, [k]: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })} /></label>)}
      </div>
      {borrador.tipo === 'texto' && <label className="field">Texto de anotación<input className="input-sm" value={borrador.texto} maxLength={150} onChange={e => setBorrador({ ...borrador, texto: e.target.value })} /></label>}
      <button type="button" className="secondary" onClick={() => agregar()}>{editando ? 'Actualizar anotación' : 'Agregar anotación'}</button>{editando && <button type="button" className="text-button" onClick={() => { setEditando(null); setBorrador(vacia()); }}>Cancelar edición de anotación</button>}
    </fieldset>}
    <ol aria-label="Anotaciones de la captura">{anotaciones.map((a, i) => <li key={a.id}>{TIPOS[a.tipo]}{a.texto && `: ${a.texto}`}{editable && <><button type="button" className="text-button" disabled={guardando} aria-label={`Editar anotación ${i + 1}`} onClick={() => { setBorrador({ ...a }); setEditando(a.id); }}>Editar</button><button type="button" className="text-button" disabled={guardando} aria-label={`Eliminar anotación ${i + 1}`} onClick={() => cambiar(anotaciones.filter(n => n.id !== a.id))}>Eliminar</button></>}</li>)}</ol>
    {editable && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" className="secondary" disabled={!historial.length || guardando} onClick={() => { setAnotaciones(historial[historial.length - 1]); setHistorial(h => h.slice(0, -1)); setEstado(''); }}>Deshacer</button><button type="button" className="primary" disabled={!dirty || guardando} onClick={() => void guardar()}>{guardando ? 'Guardando anotaciones…' : 'Guardar anotaciones'}</button></div>}
    {error && <p role="alert">{error}{editable && <button type="button" className="text-button" disabled={guardando} onClick={() => void recuperar()}>Recuperar anotaciones guardadas</button>}</p>}<p role="status">{estado || (dirty ? 'Anotaciones pendientes de guardar.' : '')}</p>
  </section>;
}

function Captura({ id, onPendingChange, ...props }: Omit<Props, 'evidenciaIds' | 'onChange'> & { id: string }) {
  const userId = useAuthStore(s => s.user?.id);
  const q = useQuery({ queryKey: ['flujo-evidencia', props.proyectoId, props.evaluacionId, id, userId], queryFn: () => cargarEvidencia(props.proyectoId, props.evaluacionId, id), retry: false });
  if (q.isError) return <p role="alert">No se pudo cargar esta evidencia. <button type="button" className="text-button" onClick={() => void q.refetch()}>Reintentar captura</button></p>;
  if (!q.data) return <p role="status">Cargando captura…</p>;
  return <Lienzo key={`${id}:${userId}`} {...props} meta={q.data.meta} blob={q.data.blob} onPendingChange={onPendingChange} />;
}

export function EvidenciaEditor({ proyectoId, evaluacionId, evidenciaIds, editable, onChange, onPendingChange }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [pendientes, setPendientes] = useState<Record<string, boolean>>({});
  const pendingRef = useRef(onPendingChange); pendingRef.current = onPendingChange;
  const idsRef = useRef(evidenciaIds); idsRef.current = evidenciaIds;
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const pending = subiendo || evidenciaIds.some(id => pendientes[id]);
  useEffect(() => { pendingRef.current?.(pending); }, [pending]);
  useEffect(() => () => pendingRef.current?.(false), []);
  async function subir(archivo: File) {
    const problema = validarArchivoEvidencia(archivo); setError(problema ?? ''); if (problema) return;
    setSubiendo(true);
    try { const e = await subirEvidenciaFlujo(proyectoId, evaluacionId, archivo); changeRef.current?.([...idsRef.current, e.id]); }
    catch (e) { setError(mensaje(e)); } finally { setSubiendo(false); }
  }
  return <div>
    {editable && onChange && <label className="field">Adjuntar captura<input type="file" accept="image/png,image/jpeg,image/webp" disabled={subiendo || evidenciaIds.length >= 50} onChange={e => { const archivo = e.target.files?.[0]; e.target.value = ''; if (archivo) void subir(archivo); }} /><small>PNG, JPEG o WebP. Máximo 2 MB por imagen.</small></label>}
    {subiendo && <p role="status">Subiendo captura…</p>}{error && <p role="alert">{error}</p>}
    {evidenciaIds.map(id => <div key={id}><Captura proyectoId={proyectoId} evaluacionId={evaluacionId} id={id} editable={editable} onPendingChange={v => setPendientes(p => p[id] === v ? p : { ...p, [id]: v })} />{editable && onChange && <button type="button" className="text-button" disabled={subiendo || pendientes[id]} onClick={() => onChange(evidenciaIds.filter(n => n !== id))}>Quitar captura del hallazgo</button>}</div>)}
  </div>;
}
