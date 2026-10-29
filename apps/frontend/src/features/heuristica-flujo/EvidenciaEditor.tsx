import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EVIDENCIA_MAX_BYTES, EVIDENCIA_MAX_MB } from '@observatorio-ux/shared-types';
import type { AnotacionEvidencia, EvidenciaFlujo } from '@observatorio-ux/shared-types';
import { useAuthStore } from '../auth/store/useAuthStore';
import { Icon } from '../../shared/components/ui/Icon';
import { comprimirImagen } from '../../shared/utils/comprimir-imagen';
import { cargarEvidencia, guardarAnotaciones, subirEvidenciaFlujo } from './evidencia.api';
import { normalizarTipoEvidencia, validarImagenEvidencia } from './evidencia-validar';
import { FLECHAS, Marca, Tiradores, ajustarConTeclado, avanzarGesto, iniciarGesto, puntoEnSvg, terminarGesto } from './anotaciones-interaccion';
import type { Gesto } from './anotaciones-interaccion';

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

/** Herramientas y gestos del visor editable; comparten estado e historial con el editor. */
interface EdicionVisor {
  forma: Forma; color: string; deshabilitado: boolean; puedeDeshacer: boolean;
  seleccionada?: AnotacionEvidencia; preview: AnotacionEvidencia | null;
  onForma: (f: Forma) => void; onColor: (c: string) => void; onDeshacer: () => void; onEliminar: () => void;
  gestos: Pick<SVGProps<SVGSVGElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>;
}

/** Captura a pantalla casi completa, con las anotaciones actuales. Se cierra con Esc, con el fondo o con el botón. Con `edicion` se puede anotar. */
function VisorAmpliado({ url, anotaciones, conMarcas, onClose, edicion }: { url: string; anotaciones: AnotacionEvidencia[]; conMarcas: boolean; onClose: () => void; edicion?: EdicionVisor }) {
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
        {edicion && conMarcas && <div className="evidencia-herramientas evidencia-visor-barra" role="toolbar" aria-label="Herramientas de anotación de la captura ampliada">
          {FORMAS.map(f => <button key={f} type="button" className="evidencia-accion" aria-label={`${TIPOS[f]} (captura ampliada)`} title={TIPOS[f]} aria-pressed={(edicion.seleccionada?.tipo ?? edicion.forma) === f} disabled={edicion.deshabilitado} onClick={() => edicion.onForma(f)}><Icon name={ICONO_FORMA[f]} size={20} /></button>)}
          <input type="color" className="evidencia-color" aria-label="Color (captura ampliada)" title="Color" value={edicion.seleccionada?.color ?? edicion.color} disabled={edicion.deshabilitado} onChange={e => edicion.onColor(e.target.value)} />
          <button type="button" className="secondary" aria-label="Deshacer (captura ampliada)" disabled={!edicion.puedeDeshacer || edicion.deshabilitado} onClick={edicion.onDeshacer}>Deshacer</button>
          <button type="button" className="evidencia-accion evidencia-accion--danger" aria-label="Eliminar anotación seleccionada" title="Eliminar anotación seleccionada" disabled={!edicion.seleccionada || edicion.deshabilitado} onClick={edicion.onEliminar}><Icon name="trash" size={20} /></button>
        </div>}
        <div className="evidencia-visor-imagen">
          <img src={url} alt="Captura de evidencia ampliada" />
          {conMarcas && (edicion
            ? <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Anotaciones de la captura ampliada" {...edicion.gestos} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}>
              {anotaciones.map(a => <Marca key={a.id} anotacion={a} />)}{edicion.preview && <Marca anotacion={edicion.preview} />}
              {edicion.seleccionada && <Tiradores anotacion={edicion.seleccionada} />}
            </svg>
            : <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>{anotaciones.map(a => <Marca key={a.id} anotacion={a} />)}</svg>)}
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
  /** Gestos de puntero compartidos por el editor y el visor ampliado; `alClic` decide qué hace un clic sin arrastre sobre vacío. */
  function gestos(alClic: () => void): EdicionVisor['gestos'] {
    return {
      onPointerDown: e => {
        if (!editable || guardando) return;
        const p = puntoEnSvg(e); e.currentTarget.setPointerCapture?.(e.pointerId);
        // Apuntar a una marca existente la selecciona y permite moverla; en vacío se dibuja una nueva.
        const inicio = iniciarGesto(anotaciones, seleccionada, p);
        if (inicio.seleccion !== undefined) setSeleccion(inicio.seleccion);
        gesto.current = inicio.gesto;
      },
      onPointerMove: e => {
        const g = gesto.current; if (!g) return;
        const { preview: previa, vivo: movida } = avanzarGesto(g, puntoEnSvg(e), forma, color);
        if (previa) setPreview(previa);
        if (movida) setVivo(movida);
      },
      onPointerUp: e => {
        const g = gesto.current; if (!g) return;
        const r = terminarGesto(g, puntoEnSvg(e)); gesto.current = null; setPreview(null); setVivo(null);
        // Un clic sin arrastre abre la captura en grande (solo en el editor); sobre una marca solo la selecciona.
        if (r.tipo === 'clic') alClic();
        else if (r.tipo === 'trazo') agregar(r.trazo);
        else if (r.tipo === 'modificada') cambiar(anotaciones.map(n => n.id === r.anotacion.id ? r.anotacion : n));
      },
      onPointerCancel: () => { gesto.current = null; setPreview(null); setVivo(null); },
    };
  }
  function deshacer() { setAnotaciones(historial[historial.length - 1]); setHistorial(h => h.slice(0, -1)); setEstado(''); }
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
        {...gestos(() => setAmpliada(true))}>
        {visibles.map(a => <Marca key={a.id} anotacion={a} resaltada={a.id === resaltada} />)}{preview && <Marca anotacion={preview} />}
        {seleccionada && <Tiradores anotacion={seleccionada} />}
      </svg>}
    </div>
    <ol className="evidencia-lista" aria-label="Anotaciones de la captura">{anotaciones.map((a, i) => <li key={a.id} className="evidencia-tarjeta" tabIndex={0} aria-label={`Anotación ${i + 1}`}
      onMouseEnter={() => setResaltada(a.id)} onMouseLeave={() => setResaltada(null)} onFocus={() => { setResaltada(a.id); if (editable && a.tipo !== 'texto') setSeleccion(a.id); }}
      onKeyDown={e => {
        const d = FLECHAS[e.key];
        if (!d || !editable || guardando || a.tipo === 'texto' || e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        const nueva = ajustarConTeclado(a, d, e.shiftKey);
        if (JSON.stringify(nueva) !== JSON.stringify(a)) cambiar(anotaciones.map(n => n.id === a.id ? nueva : n));
      }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setResaltada(null); }}>
      <span className="evidencia-muestra" style={{ background: a.color }} aria-hidden="true" />
      <span className="evidencia-nombre">{TIPOS[a.tipo]}{a.texto && `: ${a.texto}`}</span>
      {editable && a.tipo !== 'texto' && <>
        <input type="color" className="evidencia-color" aria-label={`Color de la anotación ${i + 1}`} value={a.color} disabled={guardando} onChange={e => modificar(a.id, { color: e.target.value })} />
        <select className="input-sm" aria-label={`Forma de la anotación ${i + 1}`} value={a.tipo} disabled={guardando} onChange={e => modificar(a.id, { tipo: e.target.value as Forma })}>{FORMAS.map(f => <option key={f} value={f}>{TIPOS[f]}</option>)}</select>
      </>}
      {editable && <button type="button" className="evidencia-accion evidencia-accion--danger" disabled={guardando} aria-label={`Eliminar anotación ${i + 1}`} title="Eliminar anotación" onClick={() => cambiar(anotaciones.filter(n => n.id !== a.id))}><Icon name="trash" size={20} /></button>}
    </li>)}</ol>
    {editable && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" className="secondary" disabled={!historial.length || guardando} onClick={deshacer}>Deshacer</button><button type="button" className="primary" disabled={!dirty || guardando} onClick={() => void guardar()}>{guardando ? 'Guardando anotaciones…' : 'Guardar anotaciones'}</button></div>}
    {error && <p role="alert">{error}{editable && <button type="button" className="text-button" disabled={guardando} onClick={() => void recuperar()}>Recuperar anotaciones guardadas</button>}</p>}<p role="status">{estado || (dirty ? 'Anotaciones pendientes de guardar.' : '')}</p>
    {ampliada && url && <VisorAmpliado url={url} anotaciones={visibles} conMarcas={!original} onClose={() => setAmpliada(false)}
      edicion={editable ? {
        forma, color, deshabilitado: guardando, puedeDeshacer: historial.length > 0, seleccionada, preview, gestos: gestos(() => undefined),
        onForma: f => { if (seleccionada) modificar(seleccionada.id, { tipo: f }); setForma(f); },
        onColor: c => { if (seleccionada) modificar(seleccionada.id, { color: c }); setColor(c); },
        onDeshacer: deshacer,
        onEliminar: () => { if (seleccionada) { cambiar(anotaciones.filter(n => n.id !== seleccionada.id)); setSeleccion(null); } },
      } : undefined} />}
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
