// Gráficos de card sorting para los PDF (el del estudio y el informe del proyecto):
// mapas de calor de las matrices y dendrograma dibujado, como en la página de resultados.
import type { Content, TableCell } from 'pdfmake/interfaces';
import { INK, MUTED } from '../../shared/utils/pdf-base';
import { clusterPromedio, type NodoCluster } from './card-sorting-cluster';

/** Color del mapa de calor: de blanco al Azul Eléctrico de la marca según la intensidad (0–1). */
const CALOR = [37, 63, 246];
export function colorCalor(intensidad: number): string {
  const t = Math.min(1, Math.max(0, intensidad));
  return '#' + CALOR.map(c => Math.round(255 + (c - 255) * t).toString(16).padStart(2, '0')).join('');
}

const abreviar = (texto: string, max: number) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

export interface MatrizCalor {
  /** Encabezado de la primera columna (qué representan las filas). */
  encabezado: string;
  filas: string[];
  columnas: string[];
  valores: number[][];
  /** Valor que equivale a intensidad máxima (100 en porcentajes; el máximo en conteos). */
  maximo: number;
  /** Filas y columnas son las mismas tarjetas: la diagonal no aporta y se atenúa. */
  diagonal?: boolean;
  unidad?: '%' | '';
}

/**
 * Mapa de calor como tabla de pdfmake: se parte entre páginas repitiendo el encabezado.
 * Con muchas columnas se numeran y la leyenda va en la primera columna.
 */
export function mapaCalor(m: MatrizCalor, anchoUtil: number): Content[] {
  if (!m.filas.length || !m.columnas.length) return [{ text: 'Sin datos para esta vista.', margin: [0, 0, 0, 8] }];
  const numeradas = m.diagonal || m.columnas.length > 8;
  const etiquetaW = 128;
  // Bajo 9 pt por celda (+3 de bordes y relleno) no se lee: se remite al CSV.
  if (m.columnas.length > Math.floor((anchoUtil - etiquetaW) / 12)) {
    return [{ text: `Esta matriz tiene ${m.columnas.length} columnas y no cabe legible en una página. Descárgala como CSV para verla completa.`, margin: [0, 0, 0, 8] }];
  }
  const celdaW = Math.max(9, Math.floor((anchoUtil - etiquetaW) / m.columnas.length) - 3);
  const fuente = celdaW >= 26 ? 8 : celdaW >= 16 ? 6.5 : 5.5;
  const encabezados: TableCell[] = [
    { text: m.encabezado, bold: true, fontSize: 7, color: '#ffffff', fillColor: INK },
    ...m.columnas.map((c, j) => ({
      text: numeradas ? String(j + 1) : abreviar(c, Math.max(6, Math.floor(celdaW / 4))),
      bold: true, fontSize: numeradas ? fuente : 6.5, color: '#ffffff', fillColor: INK, alignment: 'center' as const,
    })),
  ];
  const cuerpo = m.filas.map((fila, i): TableCell[] => [
    { text: `${m.diagonal ? `${i + 1}. ` : ''}${abreviar(fila, 30)}`, fontSize: 7, bold: true, color: INK },
    ...m.valores[i].map((v, j): TableCell => {
      if (m.diagonal && i === j) return { text: '', fillColor: '#e6eaf1' };
      const intensidad = m.maximo ? v / m.maximo : 0;
      return {
        text: v ? `${v}${m.unidad ?? ''}` : '', fontSize: fuente, alignment: 'center',
        fillColor: v ? colorCalor(intensidad) : '#ffffff', color: intensidad > 0.55 ? '#ffffff' : INK,
      };
    }),
  ]);
  const leyendaColumnas: Content[] = numeradas && !m.diagonal
    ? [{ text: m.columnas.map((c, j) => `${j + 1}. ${c}`).join('   '), fontSize: 7, color: MUTED, margin: [0, 0, 0, 6] }]
    : [];
  return [
    ...leyendaColumnas,
    {
      table: { headerRows: 1, dontBreakRows: true, widths: [etiquetaW, ...m.columnas.map(() => celdaW)], body: [encabezados, ...cuerpo] },
      layout: {
        hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#ffffff', vLineColor: () => '#ffffff',
        paddingLeft: () => 1.5, paddingRight: () => 1.5, paddingTop: () => 2.5, paddingBottom: () => 2.5,
      },
      margin: [0, 0, 0, 6],
    },
    escalaCalor(m.unidad === '%' ? ['0%', '50%', '100%'] : ['0', String(Math.round(m.maximo / 2)), String(m.maximo)]),
  ];
}

/** Leyenda de la escala de color bajo el mapa. */
function escalaCalor(marcas: [string, string, string] | string[]): Content {
  const pasos = 12, w = 14;
  return {
    columns: [
      { width: 'auto', text: 'Escala:', fontSize: 7, color: MUTED, margin: [0, 1, 6, 0] },
      { width: 'auto', stack: [
        { canvas: Array.from({ length: pasos }, (_, k) => ({ type: 'rect' as const, x: k * w, y: 0, w, h: 7, color: colorCalor(k / (pasos - 1)), lineWidth: 0 })) },
        { columns: marcas.map((t, k) => ({ text: t, fontSize: 6.5, color: MUTED, width: k === marcas.length - 1 ? 'auto' as const : (pasos * w) / (marcas.length - 1) })), margin: [0, 2, 0, 0] },
      ] },
    ],
    margin: [0, 0, 0, 14],
  };
}

/**
 * Dendrograma dibujado: nombres de tarjeta a la izquierda (tabla de alto fijo por fila)
 * y el árbol en SVG a la derecha, alineados fila a fila. Cabe en una página.
 */
export function dendrogramaPdf(tarjetas: string[], similitud: number[][], anchoUtil: number, altoUtil: number): Content[] {
  const raiz = clusterPromedio(similitud);
  if (!raiz || tarjetas.length < 2) return [{ text: 'Se necesitan al menos 2 tarjetas para armar el dendrograma.', color: MUTED, margin: [0, 0, 0, 8] }];
  const orden = raiz.tarjetas;
  const etiquetaW = 150;
  const graficoW = anchoUtil - etiquetaW - 8;
  // Bajo 7 pt por fila no se lee y el árbol no cabe entero en la hoja: se remite al CSV.
  if (orden.length > Math.floor((altoUtil - 40) / 7)) {
    return [{ text: `Este dendrograma tiene ${orden.length} tarjetas y no cabe legible en una hoja. Revísalo en la aplicación o descarga la matriz de similitud como CSV.`, margin: [0, 0, 0, 8] }];
  }
  const fila = Math.min(16, Math.floor((altoUtil - 40) / orden.length));
  const fuente = Math.min(8, fila - 2.5);
  const alto = orden.length * fila;
  const yHoja = new Map(orden.map((t, k) => [t, k * fila + fila / 2]));
  const posX = (distancia: number) => (distancia / 100) * (graficoW - 4) + 2;
  const trazos: string[] = [];
  const colocar = (n: NodoCluster): { x: number; y: number } => {
    if (!n.izq || !n.der) return { x: posX(0), y: yHoja.get(n.tarjetas[0]) ?? 0 };
    const a = colocar(n.izq), b = colocar(n.der), x = posX(n.distancia);
    trazos.push(`M${a.x} ${a.y}H${x}V${b.y}H${b.x}`);
    return { x, y: (a.y + b.y) / 2 };
  };
  colocar(raiz);
  const guias = [0, 25, 50, 75, 100].map(d => `<line x1="${posX(d)}" y1="0" x2="${posX(d)}" y2="${alto}" stroke="#d7dde7" stroke-width="0.6" stroke-dasharray="3 3"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${graficoW}" height="${alto}" viewBox="0 0 ${graficoW} ${alto}">${guias}<path d="${trazos.join('')}" fill="none" stroke="#253ff6" stroke-width="1.4"/></svg>`;
  return [
    {
      columns: [
        { width: etiquetaW, table: { widths: [etiquetaW - 4], heights: fila, body: orden.map(t => [{ text: abreviar(tarjetas[t], 34), fontSize: fuente, color: INK, alignment: 'right' as const, noWrap: true }]) }, layout: { defaultBorder: false, paddingLeft: () => 0, paddingRight: () => 4, paddingTop: () => (fila - fuente * 1.18) / 2, paddingBottom: () => 0 } },
        { width: graficoW, svg },
      ],
      columnGap: 8,
      unbreakable: true,
    },
    {
      columns: [{ width: etiquetaW + 8, text: '' }, ...[100, 75, 50, 25, 0].map((s, k) => ({ width: k < 4 ? (graficoW - 4) / 4 : 'auto' as const, text: `${s}%`, fontSize: 6.5, color: MUTED }))],
      margin: [0, 3, 0, 2],
    },
    { text: 'Similitud al unirse: a la izquierda, tarjetas que casi siempre van juntas; a la derecha, grupos que se unen con poco acuerdo.', fontSize: 7, color: MUTED, margin: [0, 0, 0, 14] },
  ];
}
