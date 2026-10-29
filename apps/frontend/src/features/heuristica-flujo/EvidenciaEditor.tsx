import { useEffect, useId, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EVIDENCIA_MAX_BYTES, EVIDENCIA_MAX_MB } from '@observatorio-ux/shared-types';
import type { AnotacionEvidencia, EvidenciaFlujo } from '@observatorio-ux/shared-types';
import { useAuthStore } from '../auth/store/useAuthStore';
import { Icon } from '../../shared/components/ui/Icon';
import { comprimirImagen } from '../../shared/utils/comprimir-imagen';
import { cargarEvidencia, guardarAnotaciones, subirEvidenciaFlujo } from './evidencia.api';
import { normalizarTipoEvidencia, validarImagenEvidencia } from './evidencia-validar';

interface Props {
  proyectoId: string; evaluacionId: string; evidenciaIds: string[]; editable: boolean;
  onChange?: (ids: string[]) => void;
  onPendingChange?: (pending: boolean) => void;
  /** Permite subir y quitar capturas, pero sin herramientas de anotación (mejoras antes/después). */
  sinAnotar?: boolean; max?: number; etiqueta?: string;
}
const TIPOS = { rectangulo: 'Rectángulo', circulo: 'Círculo', flecha: 'Flecha', destacado: 'Destacado', texto: 'Texto' } as const;
type Forma = Exclude<AnotacionEvidencia['tipo'], 'texto'>;
const FORMAS: Forma[] = ['rectangulo', 'circulo', 'flecha', 'destacado'];
const ICONO_FORMA = { rectangulo: 'shape-rect', circulo: 'shape-circle', flecha: 'shape-arrow', destacado: 'shape-highlight' } as const;
const mensaje = (e: unknown) => e instanceof Error ? e.message : 'No se pudo guardar la captura.';

function MarcaBase({ anotacion: a }: { anotacion: AnotacionEvidencia }) {
  const marker = useId().replace(/:/g, '');
  const x = Math.min(a.x, a.x2) * 1000, y = Math.min(a.y, a.y2) * 1000;
  const w = Math.abs(a.x2 - a.x) * 1000, h = Math.abs(a.y2 - a.y) * 1000;
  if (a.tipo === 'texto') return <text x={a.x * 1000} y={a.y * 1000} fill={a.color} fontSize="25">{a.texto}</text>;
  if (a.tipo === 'circulo') return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} stroke={a.color} strokeWidth="5" fill="none" />;
  if (a.tipo === 'flecha') return <g><defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill={a.color} /></marker></defs><line x1={a.x * 1000} y1={a.y * 1000} x2={a.x2 * 1000} y2={a.y2 * 1000} stroke={a.color} strokeWidth="5" markerEnd={`url(#${marker})`} /></g>;
  return <rect x={x} y={y} width={w} height={h} stroke={a.tipo === 'destacado' ? 'none' : a.color} strokeWidth="5" fill={a.tipo === 'destacado' ? a.color : 'none'} fillOpacity="0.3" />;
}

function Marca({ anotacion, resaltada }: { anotacion: AnotacionEvidencia; resaltada?: boolean }) {
  return <g className={resaltada ? 'evidencia-marca--resaltada' : undefined}><MarcaBase anotacion={anotacion} /></g>;
}

/** Distancia (0–1) bajo la cual un gesto sobre la captura cuenta como clic y no como trazo. */
const UMBRAL_CLIC = 0.01;
/** Radio (0–1) de agarre de un tirador y holgura al apuntar a una marca. */
const RADIO_TIRADOR = 0.025;
const HOLGURA_MARCA = 0.015;

type Punto = { x: number; y: number };
type Tirador = 'nw' | 'ne' | 'sw' | 'se' | 'ini' | 'fin';
type Gesto =
  | { tipo: 'dibujar'; ini: Punto }
  | { tipo: 'mover'; origen: Punto; base: AnotacionEvidencia }
  | { tipo: 'redimensionar'; origen: Punto; base: AnotacionEvidencia; tirador: Tirador };

const limitar = (v: number) => Math.max(0, Math.min(1, v));
const cajaDe = (a: AnotacionEvidencia) => ({ x1: Math.min(a.x, a.x2), y1: Math.min(a.y, a.y2), x2: Math.max(a.x, a.x2), y2: Math.max(a.y, a.y2) });
const CURSOR_TIRADOR: Record<Tirador, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', ini: 'pointer', fin: 'pointer' };

function tiradoresDe(a: AnotacionEvidencia): { id: Tirador; x: number; y: number }[] {
  if (a.tipo === 'flecha') return [{ id: 'ini', x: a.x, y: a.y }, { id: 'fin', x: a.x2, y: a.y2 }];
  const c = cajaDe(a);
  return [{ id: 'nw', x: c.x1, y: c.y1 }, { id: 'ne', x: c.x2, y: c.y1 }, { id: 'sw', x: c.x1, y: c.y2 }, { id: 'se', x: c.x2, y: c.y2 }];
}

function tiradorEn(a: AnotacionEvidencia, p: Punto): Tirador | undefined {
  return tiradoresDe(a).find(t => Math.hypot(t.x - p.x, t.y - p.y) <= RADIO_TIRADOR)?.id;
}

function distanciaASegmento(p: Punto, a: AnotacionEvidencia) {
  const dx = a.x2 - a.x, dy = a.y2 - a.y, largo = dx * dx + dy * dy;
  const t = largo === 0 ? 0 : limitar(((p.x - a.x) * dx + (p.y - a.y) * dy) / largo);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function sobreMarca(a: AnotacionEvidencia, p: Punto) {
  if (a.tipo === 'flecha') return distanciaASegmento(p, a) <= HOLGURA_MARCA;
  const c = cajaDe(a);
  if (a.tipo === 'circulo') {
    const rx = (c.x2 - c.x1) / 2 + HOLGURA_MARCA, ry = (c.y2 - c.y1) / 2 + HOLGURA_MARCA;
    return ((p.x - (c.x1 + c.x2) / 2) / rx) ** 2 + ((p.y - (c.y1 + c.y2) / 2) / ry) ** 2 <= 1;
  }
  return p.x >= c.x1 - HOLGURA_MARCA && p.x <= c.x2 + HOLGURA_MARCA && p.y >= c.y1 - HOLGURA_MARCA && p.y <= c.y2 + HOLGURA_MARCA;
}

/** Marca resultante de un gesto de mover o redimensionar, siempre dentro de 0–1. */
function aplicarGesto(g: Exclude<Gesto, { tipo: 'dibujar' }>, p: Punto): AnotacionEvidencia {
  const b = g.base;
  if (g.tipo === 'mover') {
    const c = cajaDe(b);
    const dx = Math.max(-c.x1, Math.min(1 - c.x2, p.x - g.origen.x)), dy = Math.max(-c.y1, Math.min(1 - c.y2, p.y - g.origen.y));
    return { ...b, x: b.x + dx, y: b.y + dy, x2: b.x2 + dx, y2: b.y2 + dy };
  }
  if (g.tirador === 'ini') return { ...b, x: p.x, y: p.y };
  if (g.tirador === 'fin') return { ...b, x2: p.x, y2: p.y };
  const c = cajaDe(b);
  return { ...b, x: g.tirador.endsWith('w') ? c.x2 : c.x1, y: g.tirador.startsWith('n') ? c.y2 : c.y1, x2: p.x, y2: p.y };
}

/** Captura a pantalla casi completa, con las anotaciones actuales. Se cierra con Esc, con el fondo o con el botón. */
function VisorAmpliado({ url, anotaciones, conMarcas, onClose }: { url: string; anotaciones: AnotacionEvidencia[]; conMarcas: boolean; onClose: () => void }) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const alCerrar = useRef(onClose); alCerrar.current = onClose;
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); alCerrar.current(); } };
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = overflow; previo?.focus?.(); };
  }, []);
  return createPortal(
    <div className="evidencia-visor-fondo" role="dialog" aria-modal="true" aria-label="Captura ampliada" onClick={onClose}>
      <div className="evidencia-visor-caja" onClick={e => e.stopPropagation()}>
        <button ref={cerrarRef} type="button" className="evidencia-accion evidencia-visor-cerrar" aria-label="Cerrar vista ampliada" title="Cerrar (Esc)" onClick={onClose}><Icon name="close" size={20} /></button>
        <div className="evidencia-visor-imagen">
          <img src={url} alt="Captura de evidencia ampliada" />
          {conMarcas && <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>{anotaciones.map(a => <Marca key={a.id} anotacion={a} />)}</svg>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Lienzo({ proyectoId, evaluacionId, meta, blob, editable, onPendingChange }: Omit<Props, 'evidenciaIds' | 'onChange'> & { meta: EvidenciaFlujo; blob: Blob }) {
  const qc = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const [url, setUrl] = useState('');
  const [anotaciones, setAnotaciones] = useState<AnotacionEvidencia[]>(() => meta.anotaciones ?? []);
  const [guardadas, setGuardadas] = useState(() => JSON.stringify(meta.anotaciones ?? []));
  const [revision, setRevision] = useState(meta.revision);
  const [historial, setHistorial] = useState<AnotacionEvidencia[][]>([]);
  const [forma, setForma] = useState<Forma>('rectangulo');
  const [color, setColor] = useState('#d83232');
  const [resaltada, setResaltada] = useState<string | null>(null);
  const [original, setOriginal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<AnotacionEvidencia | null>(null);
  const [ampliada, setAmpliada] = useState(false);
  const gesto = useRef<Gesto | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [vivo, setVivo] = useState<AnotacionEvidencia | null>(null);
  const pendingRef = useRef(onPendingChange); pendingRef.current = onPendingChange;
  const dirty = JSON.stringify(anotaciones) !== guardadas;
  const visibles = vivo ? anotaciones.map(a => a.id === vivo.id ? vivo : a) : anotaciones;
  const seleccionada = editable && !original ? visibles.find(a => a.id === seleccion) : undefined;
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
  function agregar(trazo: Pick<AnotacionEvidencia, 'x' | 'y' | 'x2' | 'y2'>) {
    if (guardando) return;
    if (anotaciones.length >= 50) { setError('Máximo 50 anotaciones por captura.'); return; }
    cambiar([...anotaciones, { id: crypto.randomUUID(), tipo: forma, color, texto: '', ...trazo }]); setError('');
  }
  function modificar(id: string, cambio: Partial<AnotacionEvidencia>) { cambiar(anotaciones.map(n => n.id === id ? { ...n, ...cambio } : n)); }
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
    {editable && <>
      <div className="evidencia-guia"><strong>Dibuja sobre la captura para marcar el problema</strong><span>Un clic sin arrastrar abre la imagen en grande</span><span>El original se conserva</span></div>
      <div className="evidencia-herramientas" role="toolbar" aria-label="Herramientas de anotación">
        {FORMAS.map(f => <button key={f} type="button" className="evidencia-accion" aria-label={TIPOS[f]} title={TIPOS[f]} aria-pressed={forma === f} disabled={guardando} onClick={() => setForma(f)}><Icon name={ICONO_FORMA[f]} size={20} /></button>)}
        <input type="color" className="evidencia-color" aria-label="Color" title="Color" value={color} disabled={guardando} onChange={e => setColor(e.target.value)} />
      </div>
    </>}
    <label className="field"><input type="checkbox" checked={original} onChange={e => setOriginal(e.target.checked)} /> Mostrar imagen original</label>
    <div style={{ position: 'relative', width: '100%', maxWidth: 720, marginBlock: 12 }}>
      <img src={url} alt="Captura de evidencia" style={{ display: 'block', width: '100%', height: 'auto', cursor: 'zoom-in' }} onClick={() => setAmpliada(true)} />
      <button type="button" className="evidencia-accion evidencia-ampliar" aria-label="Ampliar captura" title="Ver en grande" onClick={() => setAmpliada(true)}><Icon name="zoom-in" size={20} /></button>
      {!original && <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Vista de las anotaciones" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: editable ? 'none' : 'auto', cursor: editable ? 'crosshair' : 'zoom-in' }}
        onClick={() => { if (!editable) setAmpliada(true); }}
        onPointerDown={e => {
          if (!editable || guardando) return;
          const p = punto(e); e.currentTarget.setPointerCapture?.(e.pointerId);
          const tirador = seleccionada && tiradorEn(seleccionada, p);
          if (seleccionada && tirador) { gesto.current = { tipo: 'redimensionar', origen: p, base: seleccionada, tirador }; return; }
          // Apuntar a una marca existente la selecciona y permite moverla; en vacío se dibuja una nueva.
          const objetivo = [...anotaciones].reverse().find(a => a.tipo !== 'texto' && sobreMarca(a, p));
          if (objetivo) { setSeleccion(objetivo.id); gesto.current = { tipo: 'mover', origen: p, base: objetivo }; return; }
          setSeleccion(null); gesto.current = { tipo: 'dibujar', ini: p };
        }}
        onPointerMove={e => {
          const g = gesto.current; if (!g) return;
          const p = punto(e);
          if (g.tipo === 'dibujar') setPreview({ id: 'preview', tipo: forma, color, texto: '', ...g.ini, x2: p.x, y2: p.y });
          else if (Math.hypot(p.x - g.origen.x, p.y - g.origen.y) >= UMBRAL_CLIC) setVivo(aplicarGesto(g, p));
        }}
        onPointerUp={e => {
          const g = gesto.current; if (!g) return;
          const p = punto(e); gesto.current = null; setPreview(null); setVivo(null);
          if (g.tipo === 'dibujar') {
            // Un clic sin arrastre abre la captura en grande.
            if (Math.hypot(p.x - g.ini.x, p.y - g.ini.y) < UMBRAL_CLIC) { setAmpliada(true); return; }
            agregar({ ...g.ini, x2: p.x, y2: p.y }); return;
          }
          // Un clic sin arrastre sobre una marca solo la selecciona.
          if (Math.hypot(p.x - g.origen.x, p.y - g.origen.y) < UMBRAL_CLIC) return;
          const nueva = aplicarGesto(g, p);
          cambiar(anotaciones.map(n => n.id === nueva.id ? nueva : n));
        }}
        onPointerCancel={() => { gesto.current = null; setPreview(null); setVivo(null); }}>
        {visibles.map(a => <Marca key={a.id} anotacion={a} resaltada={a.id === resaltada} />)}{preview && <Marca anotacion={preview} />}
        {seleccionada && tiradoresDe(seleccionada).map(t => <rect key={t.id} className="evidencia-tirador" x={t.x * 1000 - 9} y={t.y * 1000 - 9} width="18" height="18" style={{ cursor: CURSOR_TIRADOR[t.id] }} />)}
      </svg>}
    </div>
    <ol className="evidencia-lista" aria-label="Anotaciones de la captura">{anotaciones.map((a, i) => <li key={a.id} className="evidencia-tarjeta" tabIndex={0} aria-label={`Anotación ${i + 1}`}
      onMouseEnter={() => setResaltada(a.id)} onMouseLeave={() => setResaltada(null)} onFocus={() => setResaltada(a.id)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setResaltada(null); }}>
      <span className="evidencia-muestra" style={{ background: a.color }} aria-hidden="true" />
      <span className="evidencia-nombre">{TIPOS[a.tipo]}{a.texto && `: ${a.texto}`}</span>
      {editable && a.tipo !== 'texto' && <>
        <input type="color" className="evidencia-color" aria-label={`Color de la anotación ${i + 1}`} value={a.color} disabled={guardando} onChange={e => modificar(a.id, { color: e.target.value })} />
        <select className="input-sm" aria-label={`Forma de la anotación ${i + 1}`} value={a.tipo} disabled={guardando} onChange={e => modificar(a.id, { tipo: e.target.value as Forma })}>{FORMAS.map(f => <option key={f} value={f}>{TIPOS[f]}</option>)}</select>
      </>}
      {editable && <button type="button" className="evidencia-accion evidencia-accion--danger" disabled={guardando} aria-label={`Eliminar anotación ${i + 1}`} title="Eliminar anotación" onClick={() => cambiar(anotaciones.filter(n => n.id !== a.id))}><Icon name="trash" size={20} /></button>}
    </li>)}</ol>
    {editable && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" className="secondary" disabled={!historial.length || guardando} onClick={() => { setAnotaciones(historial[historial.length - 1]); setHistorial(h => h.slice(0, -1)); setEstado(''); }}>Deshacer</button><button type="button" className="primary" disabled={!dirty || guardando} onClick={() => void guardar()}>{guardando ? 'Guardando anotaciones…' : 'Guardar anotaciones'}</button></div>}
    {error && <p role="alert">{error}{editable && <button type="button" className="text-button" disabled={guardando} onClick={() => void recuperar()}>Recuperar anotaciones guardadas</button>}</p>}<p role="status">{estado || (dirty ? 'Anotaciones pendientes de guardar.' : '')}</p>
    {ampliada && url && <VisorAmpliado url={url} anotaciones={anotaciones} conMarcas={!original} onClose={() => setAmpliada(false)} />}
  </section>;
}

function Captura({ id, onPendingChange, ...props }: Omit<Props, 'evidenciaIds' | 'onChange'> & { id: string }) {
  const userId = useAuthStore(s => s.user?.id);
  const q = useQuery({ queryKey: ['flujo-evidencia', props.proyectoId, props.evaluacionId, id, userId], queryFn: () => cargarEvidencia(props.proyectoId, props.evaluacionId, id), retry: false });
  if (q.isError) return <p role="alert">No se pudo cargar esta evidencia. <button type="button" className="text-button" onClick={() => void q.refetch()}>Reintentar captura</button></p>;
  if (!q.data) return <p role="status">Cargando captura…</p>;
  return <Lienzo key={`${id}:${userId}`} {...props} meta={q.data.meta} blob={q.data.blob} onPendingChange={onPendingChange} />;
}

export function EvidenciaEditor({ proyectoId, evaluacionId, evidenciaIds, editable, onChange, onPendingChange, sinAnotar = false, max = 50, etiqueta }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState('');
  const [errorTamano, setErrorTamano] = useState(false);
  const [pendientes, setPendientes] = useState<Record<string, boolean>>({});
  const pendingRef = useRef(onPendingChange); pendingRef.current = onPendingChange;
  const idsRef = useRef(evidenciaIds); idsRef.current = evidenciaIds;
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const ocupado = useRef(false);
  const pending = subiendo || evidenciaIds.some(id => pendientes[id]);
  const puedeSubir = editable && !!onChange;
  useEffect(() => { pendingRef.current?.(pending); }, [pending]);
  useEffect(() => () => pendingRef.current?.(false), []);
  const fallar = (texto: string, tamano = false) => { setError(texto); setErrorTamano(tamano); };
  /** Única entrada de subida (selector, pegar y arrastrar): con guardia, en serie y hasta el cupo. */
  async function subirArchivos(archivos: File[]) {
    if (!puedeSubir || ocupado.current || !archivos.length) return;
    ocupado.current = true; setSubiendo(true); fallar('');
    let ids = idsRef.current;
    try {
      for (const original of archivos) {
        if (ids.length >= max) { fallar(`Máximo ${max} capturas en este problema.`); break; }
        const formato = await validarImagenEvidencia(original, { omitirTamano: true });
        if (formato) { fallar(formato); break; }
        const archivo = await comprimirImagen(await normalizarTipoEvidencia(original));
        const problema = await validarImagenEvidencia(archivo);
        if (problema) { fallar(problema, archivo.size > EVIDENCIA_MAX_BYTES); break; }
        const e = await subirEvidenciaFlujo(proyectoId, evaluacionId, archivo);
        ids = [...ids, e.id]; changeRef.current?.(ids);
      }
    } catch (e) {
      // Un 413 del proxy o del servidor llega sin JSON útil: se explica con el mismo aviso de tamaño.
      if ((e as { status?: number }).status === 413) fallar(`La imagen supera el máximo de ${EVIDENCIA_MAX_MB} MB. Recórtala o divídela.`, true);
      else fallar(mensaje(e));
    } finally { ocupado.current = false; setSubiendo(false); }
  }
  function pegar(e: ClipboardEvent<HTMLDivElement>) {
    const archivos = Array.from(e.clipboardData?.files ?? []);
    if (!puedeSubir || !archivos.length) return;
    e.preventDefault(); void subirArchivos(archivos);
  }
  function soltar(e: DragEvent<HTMLDivElement>) {
    if (!puedeSubir) return;
    e.preventDefault(); setArrastrando(false); void subirArchivos(Array.from(e.dataTransfer?.files ?? []));
  }
  return <div role={puedeSubir ? 'group' : undefined} aria-label={puedeSubir ? 'Zona de capturas: arrastra o pega una imagen' : undefined} tabIndex={puedeSubir ? 0 : undefined}
    style={arrastrando ? { outline: '2px dashed var(--primary)', outlineOffset: 4 } : undefined}
    onPaste={pegar} onDragOver={e => { if (puedeSubir) { e.preventDefault(); setArrastrando(true); } }}
    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false); }} onDrop={soltar}>
    {puedeSubir && <label className="field">Adjuntar captura{etiqueta ? ` ${etiqueta}` : ''}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={subiendo || evidenciaIds.length >= max} onChange={e => { const archivo = e.target.files?.[0]; e.target.value = ''; if (archivo) void subirArchivos([archivo]); }} /><small>PNG, JPEG o WebP. Máximo {EVIDENCIA_MAX_MB} MB por imagen. También puedes arrastrar la imagen aquí o pegarla con Ctrl+V después de hacer clic en esta zona.</small></label>}
    {subiendo && <p role="status">Subiendo captura…</p>}{error && <p role="alert" className="evidencia-alerta"><span aria-hidden="true">⚠</span><span>{errorTamano && <strong>Imagen demasiado pesada. </strong>}{error}</span></p>}
    {evidenciaIds.map((id, i) => {
      const quitar = etiqueta ? `Quitar captura ${etiqueta}` : 'Quitar captura del problema';
      return <div key={id} className="evidencia-item">
        {editable && onChange && <div className="evidencia-barra"><span className="text-muted-xs">Captura {i + 1}</span><button type="button" className="evidencia-accion evidencia-accion--danger" disabled={subiendo || !!pendientes[id]} aria-label={quitar} title={pendientes[id] ? 'Guarda o elimina las anotaciones pendientes antes de quitar la captura' : 'Quitar captura'} onClick={() => onChange(evidenciaIds.filter(n => n !== id))}><Icon name="trash" size={20} /></button></div>}
        <Captura proyectoId={proyectoId} evaluacionId={evaluacionId} id={id} editable={editable && !sinAnotar} onPendingChange={v => setPendientes(p => p[id] === v ? p : { ...p, [id]: v })} />
      </div>;
    })}
  </div>;
}
