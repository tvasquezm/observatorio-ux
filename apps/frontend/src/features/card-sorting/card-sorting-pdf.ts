// PDF de las vistas de resultados: reutiliza la marca y los helpers del informe general.
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { CardSortingAnalytics } from './api/card-sorting.api';
import {
  brandChrome, cargarPdfMake, date, INK, MUTED, paragraph, table, TEAL, type ReportBrand,
} from '../../shared/utils/pdf';
import {
  nombreArchivo, resumenEstudio, tablaDeVista, type SegmentoBarra, type TablaVista, type VistaExportable,
} from './card-sorting-export';

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

function cuerpo(tabla: TablaVista): Content[] {
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

function seccion(tabla: TablaVista, saltar: boolean): Content[] {
  return [
    { text: 'VISTA', style: 'eyebrow', ...(saltar ? { pageBreak: 'before' as const } : {}), pageOrientation: tabla.ancha ? ('landscape' as const) : ('portrait' as const), margin: [0, saltar ? 10 : 18, 0, 8] },
    { text: tabla.titulo, fontSize: 22, bold: true, margin: [0, 0, 0, 6] },
    { text: tabla.descripcion, color: MUTED, margin: [0, 0, 0, 12] },
    ...cuerpo(tabla),
  ];
}

export function buildEstudioPdfDefinition(
  data: CardSortingAnalytics,
  tablas: TablaVista[],
  alcance: string,
  generatedAt: Date,
  brand?: ReportBrand,
): TDocumentDefinitions {
  return {
    info: { title: `Card sorting · ${data.estudio.nombre}`, subject: tablas.map((t) => t.titulo).join(', '), creator: 'UXLab Observatorio' },
    pageSize: 'A4', pageMargins: [44, 66, 44, 54],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.2, color: INK },
    images: brand ? { brandLogo: brand.logo, brandLogoWhite: brand.logoWhite } : {},
    ...brandChrome(brand, alcance, generatedAt),
    content: [
      { text: 'RESULTADOS DE CARD SORTING', style: 'eyebrow', margin: [0, 116, 0, 12] },
      { text: data.estudio.nombre, fontSize: 28, bold: true, lineHeight: 1.08, margin: [0, 0, 0, 14] },
      { text: `${data.estudio.cerrado ? 'Estudio cerrado' : 'Estudio abierto'} · Exportado el ${date(generatedAt)}`, color: MUTED, margin: [0, 0, 0, 14] },
      { columns: resumenEstudio(data).map(([label, value]) => ({ stack: [{ text: label.toUpperCase(), style: 'eyebrow', fontSize: 7 }, { text: value, bold: true, margin: [0, 4, 0, 0] }] })), margin: [0, 0, 0, 6] },
      ...tablas.flatMap((tabla, i) => seccion(tabla, tablas.length > 1 || Boolean(tabla.ancha) ? true : i > 0)),
    ],
    styles: { subheading: { fontSize: 14, bold: true, color: INK }, eyebrow: { fontSize: 9, bold: true, color: TEAL, characterSpacing: 1 } },
  };
}

export async function exportarEstudioPdf(data: CardSortingAnalytics, vistas: VistaExportable[], alcance: 'vista' | 'todas'): Promise<void> {
  const { pdfMake, brand } = await cargarPdfMake();
  const tablas = vistas.map((vista) => tablaDeVista(vista, data));
  const etiqueta = alcance === 'todas' ? 'todas-las-vistas' : vistas[0];
  const ahora = new Date();
  await pdfMake.createPdf(buildEstudioPdfDefinition(data, tablas, alcance === 'todas' ? 'TODAS LAS VISTAS' : tablas[0].titulo.toUpperCase(), ahora, brand)).download(nombreArchivo(data.estudio.nombre, etiqueta, 'pdf'));
}
