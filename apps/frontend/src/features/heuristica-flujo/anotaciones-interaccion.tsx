import { useId } from 'react';
import type { PointerEvent } from 'react';
import type { AnotacionEvidencia } from '@observatorio-ux/shared-types';

function MarcaBase({ anotacion: a }: { anotacion: AnotacionEvidencia }) {
  const marker = useId().replace(/:/g, '');
  const x = Math.min(a.x, a.x2) * 1000, y = Math.min(a.y, a.y2) * 1000;
  const w = Math.abs(a.x2 - a.x) * 1000, h = Math.abs(a.y2 - a.y) * 1000;
  if (a.tipo === 'texto') return <text x={a.x * 1000} y={a.y * 1000} fill={a.color} fontSize="25">{a.texto}</text>;
  if (a.tipo === 'circulo') return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} stroke={a.color} strokeWidth="5" fill="none" />;
  if (a.tipo === 'flecha') return <g><defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill={a.color} /></marker></defs><line x1={a.x * 1000} y1={a.y * 1000} x2={a.x2 * 1000} y2={a.y2 * 1000} stroke={a.color} strokeWidth="5" markerEnd={`url(#${marker})`} /></g>;
  return <rect x={x} y={y} width={w} height={h} stroke={a.tipo === 'destacado' ? 'none' : a.color} strokeWidth="5" fill={a.tipo === 'destacado' ? a.color : 'none'} fillOpacity="0.3" />;
}

export function Marca({ anotacion, resaltada }: { anotacion: AnotacionEvidencia; resaltada?: boolean }) {
  return <g className={resaltada ? 'evidencia-marca--resaltada' : undefined}><MarcaBase anotacion={anotacion} /></g>;
}

/** Distancia (0–1) bajo la cual un gesto sobre la captura cuenta como clic y no como trazo. */
const UMBRAL_CLIC = 0.01;
/** Radio (0–1) de agarre de un tirador y holgura al apuntar a una marca. */
const RADIO_TIRADOR = 0.025;
const HOLGURA_MARCA = 0.015;

type Punto = { x: number; y: number };
type Tirador = 'nw' | 'ne' | 'sw' | 'se' | 'ini' | 'fin';
export type Gesto =
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

/** Paso (0–1) de cada pulsación de flecha en una tarjeta. */
const PASO_TECLADO = 0.01;
export const FLECHAS: Record<string, Punto> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };

/** Flechas mueven la marca; Mayús+flechas la redimensionan (esquina inferior derecha en formas, fin en la flecha). */
export function ajustarConTeclado(a: AnotacionEvidencia, d: Punto, redimensionar: boolean): AnotacionEvidencia {
  const dx = d.x * PASO_TECLADO, dy = d.y * PASO_TECLADO;
  if (!redimensionar) return aplicarGesto({ tipo: 'mover', origen: { x: 0, y: 0 }, base: a }, { x: dx, y: dy });
  if (a.tipo === 'flecha') return aplicarGesto({ tipo: 'redimensionar', origen: { x: 0, y: 0 }, base: a, tirador: 'fin' }, { x: limitar(a.x2 + dx), y: limitar(a.y2 + dy) });
  const c = cajaDe(a);
  return aplicarGesto({ tipo: 'redimensionar', origen: { x: 0, y: 0 }, base: a, tirador: 'se' }, { x: Math.min(1, Math.max(c.x1 + PASO_TECLADO, c.x2 + dx)), y: Math.min(1, Math.max(c.y1 + PASO_TECLADO, c.y2 + dy)) });
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


/** Punto (0–1) del puntero sobre el SVG de la captura. */
export function puntoEnSvg(e: PointerEvent<SVGSVGElement>): Punto {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
}

/** Gesto que inicia un clic en `p`: redimensiona si cae en un tirador de la marca seleccionada, mueve si cae en una marca y dibuja en vacío. `seleccion` undefined = sin cambio. */
export function iniciarGesto(anotaciones: AnotacionEvidencia[], seleccionada: AnotacionEvidencia | undefined, p: Punto): { gesto: Gesto; seleccion?: string | null } {
  const tirador = seleccionada && tiradorEn(seleccionada, p);
  if (seleccionada && tirador) return { gesto: { tipo: 'redimensionar', origen: p, base: seleccionada, tirador } };
  const objetivo = [...anotaciones].reverse().find(a => a.tipo !== 'texto' && sobreMarca(a, p));
  if (objetivo) return { gesto: { tipo: 'mover', origen: p, base: objetivo }, seleccion: objetivo.id };
  return { gesto: { tipo: 'dibujar', ini: p }, seleccion: null };
}

/** Vista previa del gesto en curso: una marca nueva al dibujar, o la marca movida/redimensionada pasado el umbral de clic. */
export function avanzarGesto(g: Gesto, p: Punto, forma: Exclude<AnotacionEvidencia['tipo'], 'texto'>, color: string): { preview?: AnotacionEvidencia; vivo?: AnotacionEvidencia } {
  if (g.tipo === 'dibujar') return { preview: { id: 'preview', tipo: forma, color, texto: '', ...g.ini, x2: p.x, y2: p.y } };
  if (Math.hypot(p.x - g.origen.x, p.y - g.origen.y) >= UMBRAL_CLIC) return { vivo: aplicarGesto(g, p) };
  return {};
}

type ResultadoGesto =
  | { tipo: 'clic' }
  | { tipo: 'nada' }
  | { tipo: 'trazo'; trazo: Pick<AnotacionEvidencia, 'x' | 'y' | 'x2' | 'y2'> }
  | { tipo: 'modificada'; anotacion: AnotacionEvidencia };

/** Resultado de soltar el puntero: un clic sin arrastre sobre vacío abre en grande y sobre una marca solo la selecciona. */
export function terminarGesto(g: Gesto, p: Punto): ResultadoGesto {
  if (g.tipo === 'dibujar') {
    if (Math.hypot(p.x - g.ini.x, p.y - g.ini.y) < UMBRAL_CLIC) return { tipo: 'clic' };
    return { tipo: 'trazo', trazo: { ...g.ini, x2: p.x, y2: p.y } };
  }
  if (Math.hypot(p.x - g.origen.x, p.y - g.origen.y) < UMBRAL_CLIC) return { tipo: 'nada' };
  return { tipo: 'modificada', anotacion: aplicarGesto(g, p) };
}

/** Tiradores de una marca seleccionada. */
export function Tiradores({ anotacion }: { anotacion: AnotacionEvidencia }) {
  return <>{tiradoresDe(anotacion).map(t => <rect key={t.id} className="evidencia-tirador" x={t.x * 1000 - 9} y={t.y * 1000 - 9} width="18" height="18" style={{ cursor: CURSOR_TIRADOR[t.id] }} />)}</>;
}
