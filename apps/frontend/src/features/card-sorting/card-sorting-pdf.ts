// PDF de las vistas de resultados: reutiliza la marca y los helpers del informe general.
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { CardSortingAnalytics } from './api/card-sorting.api';
import { brandChrome, cargarPdfMake, date, INK, MUTED, TEAL, type ReportBrand } from '../../shared/utils/pdf';
import { cuerpoVista } from './card-sorting-pdf-content';
import {
  nombreArchivo, resumenEstudio, tablaDeVista, tablaSinConsenso, type TablaVista, type VistaExportable,
} from './card-sorting-export';

export interface OpcionesEstudioPdf {
  resumen?: boolean;
  color?: boolean;
  separarSecciones?: boolean;
}

function sinColor(value: unknown): unknown {
  if (typeof value === 'function') return (...args: unknown[]) => sinColor(value(...args));
  if (Array.isArray(value)) return value.map(sinColor);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => {
    if (['color', 'fillColor', 'lineColor', 'background'].includes(key) && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) {
      const rgb = v.slice(1).match(/../g)!.map(c => parseInt(c, 16));
      const gray = Math.round(rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114).toString(16).padStart(2, '0');
      return [key, `#${gray.repeat(3)}`];
    }
    return [key, sinColor(v)];
  }));
  return value;
}

function seccion(tabla: TablaVista, saltar: boolean): Content[] {
  return [
    { text: 'VISTA', style: 'eyebrow', ...(saltar ? { pageBreak: 'before' as const } : {}), pageOrientation: tabla.ancha ? ('landscape' as const) : ('portrait' as const), margin: [0, saltar ? 10 : 18, 0, 8] },
    { text: tabla.titulo, fontSize: 22, bold: true, margin: [0, 0, 0, 6] },
    { text: tabla.descripcion, color: MUTED, margin: [0, 0, 0, 12] },
    ...cuerpoVista(tabla),
  ];
}

export function buildEstudioPdfDefinition(
  data: CardSortingAnalytics,
  tablas: TablaVista[],
  alcance: string,
  generatedAt: Date,
  brand?: ReportBrand,
  opciones: OpcionesEstudioPdf = {},
): TDocumentDefinitions {
  const resumen = opciones.resumen !== false;
  const marca = opciones.color === false ? undefined : brand;
  const chrome = brandChrome(marca, alcance, generatedAt);
  if (!resumen) {
    chrome.background = undefined;
    const header = chrome.header;
    if (typeof header === 'function') chrome.header = (page, count, size) => header(page + 1, count, size);
  }
  const definition: TDocumentDefinitions = {
    info: { title: `Card sorting · ${data.estudio.nombre}`, subject: tablas.map((t) => t.titulo).join(', '), creator: 'UXLab Observatorio' },
    pageSize: 'A4', pageOrientation: !resumen && tablas[0]?.ancha ? 'landscape' : 'portrait', pageMargins: [44, 66, 44, 54],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.2, color: INK },
    images: marca ? { brandLogo: marca.logo, brandLogoWhite: marca.logoWhite } : {},
    ...chrome,
    content: [
      ...(resumen ? [
      { text: 'RESULTADOS DE CARD SORTING', style: 'eyebrow', margin: [0, 116, 0, 12] },
      { text: data.estudio.nombre, fontSize: 28, bold: true, lineHeight: 1.08, margin: [0, 0, 0, 14] },
      { text: `${data.estudio.cerrado ? 'Card sorting cerrado' : 'Card sorting abierto'} · Exportado el ${date(generatedAt)}`, color: MUTED, margin: [0, 0, 0, 14] },
      { columns: resumenEstudio(data).map(([label, value]) => ({ stack: [{ text: label.toUpperCase(), style: 'eyebrow', fontSize: 7 }, { text: value, bold: true, margin: [0, 4, 0, 0] }] })), margin: [0, 0, 0, 6] },
      ] as Content[] : []),
      ...tablas.flatMap((tabla, i) => {
        const separar = opciones.separarSecciones ?? (tablas.length > 1 || Boolean(tabla.ancha) || i > 0);
        // Cambiar de orientación requiere una página nueva aunque no se separen las secciones.
        const orientacionDistinta = Boolean(tabla.ancha) !== (i > 0 && Boolean(tablas[i - 1].ancha));
        return seccion(tabla, (resumen || i > 0) && (separar || orientacionDistinta));
      }),
    ],
    styles: { subheading: { fontSize: 14, bold: true, color: INK }, eyebrow: { fontSize: 9, bold: true, color: TEAL, characterSpacing: 1 } },
  };
  return opciones.color === false ? sinColor(definition) as TDocumentDefinitions : definition;
}

export { precargarPdf as precargarEstudioPdf } from '../../shared/utils/pdf';

export async function exportarEstudioPdf(data: CardSortingAnalytics, vistas: VistaExportable[], alcance: 'vista' | 'todas' | 'seleccion', opciones: OpcionesEstudioPdf = {}): Promise<void> {
  const { pdfMake, brand } = await cargarPdfMake();
  const tablas = vistas.flatMap((vista) => {
    const tabla = tablaDeVista(vista, data);
    const sinConsenso = vista === 'cards' ? tablaSinConsenso(data) : null;
    return sinConsenso ? [tabla, sinConsenso] : [tabla];
  });
  const etiqueta = alcance === 'seleccion' ? 'seleccion-de-resultados' : alcance === 'todas' ? 'todas-las-vistas' : vistas[0] ?? 'resumen';
  const ahora = new Date();
  await pdfMake.createPdf(buildEstudioPdfDefinition(data, tablas, alcance === 'seleccion' ? 'RESULTADOS SELECCIONADOS' : alcance === 'todas' ? 'TODAS LAS VISTAS' : (tablas[0]?.titulo ?? 'Resumen').toUpperCase(), ahora, brand, opciones)).download(nombreArchivo(data.estudio.nombre, etiqueta, 'pdf'));
}
