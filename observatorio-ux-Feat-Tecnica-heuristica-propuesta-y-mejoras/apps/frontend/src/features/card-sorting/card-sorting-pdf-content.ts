// Contenido pdfmake de una vista (tabla, barras, matrices anchas). Lo usan el PDF del
// estudio y el informe general del proyecto.
import type { Content } from 'pdfmake/interfaces';
import { MUTED, paragraph, table } from '../../shared/utils/pdf-base';
import type { SegmentoBarra, TablaVista } from './card-sorting-export';

// Mismos colores que --c1..--c8 del tema claro (el PDF siempre es claro).
const PALETA_HEX = ['#3049b2', '#0f8b7a', '#c2571a', '#8a3fb3', '#a98300', '#c0305a', '#4f7a28', '#6b7a90'];
const MAX_COLUMNAS_ANCHAS = 17;
const BARRA_W = 104;

function barra(segmentos: SegmentoBarra[]): Content {
  let x = 0;
  const rects = segmentos.map((segmento) => {
    const w = (Math.max(0, segmento.pct) / 100) * BARRA_W;
    const rect = { type: 'rect' as const, x, y: 0, w, h: 8, color: PALETA_HEX[Math.min(segmento.color, 8) - 1] ?? PALETA_HEX[7], lineWidth: 0 };
    x += w;
    return rect;
  });
  return { canvas: [{ type: 'rect', x: 0, y: 0, w: BARRA_W, h: 8, color: '#e6eaf1', lineWidth: 0 }, ...rects], margin: [0, 2, 0, 0] };
}

const vacio = (valor: unknown) => (valor === '' || valor == null ? '—' : valor);
const abreviar = (texto: string) => (texto.length > 14 ? `${texto.slice(0, 13)}…` : texto);

export function cuerpoVista(tabla: TablaVista): Content[] {
  if (tabla.filas.length === 0) return [paragraph('Sin datos para esta vista.')];
  if (tabla.ancha && tabla.columnas.length > MAX_COLUMNAS_ANCHAS) {
    return [paragraph(`Esta matriz tiene ${tabla.columnas.length - 1} columnas y no cabe en una página. Descárgala como CSV para verla completa.`)];
  }
  const columnas = tabla.ancha ? tabla.columnas.map((c, i) => (i === 0 ? c : abreviar(c))) : tabla.columnas;
  const abreviadas = tabla.ancha && columnas.some((c, i) => c !== tabla.columnas[i]);
  const nota = abreviadas ? [{ text: 'Los nombres largos de columna se abrevian; el CSV los incluye completos.', color: MUTED, italics: true, fontSize: 8, margin: [0, 0, 0, 6] } as Content] : [];
  if (tabla.barras) {
    const barras = tabla.barras;
    return [table([...columnas, 'Distribución'], tabla.filas.map((fila, i) => [...fila.map(vacio), barras[i].length ? barra(barras[i]) : '—']), ['*', 52, 80, 34, 58, '*', BARRA_W + 8], true)];
  }
  const widths = tabla.ancha ? [110, ...columnas.slice(1).map(() => '*' as const)] : undefined;
  return [...nota, table(columnas, tabla.filas.map((fila) => fila.map(vacio)), widths, tabla.ancha || columnas.length >= 5)];
}
