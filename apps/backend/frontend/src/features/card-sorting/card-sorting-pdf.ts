// PDF de las vistas de resultados: reutiliza la marca y los helpers del informe general.
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { CardSortingAnalytics } from './api/card-sorting.api';
import { brandChrome, cargarPdfMake, date, INK, MUTED, TEAL, type ReportBrand } from '../../shared/utils/pdf';
import { cuerpoVista } from './card-sorting-pdf-content';
import {
  nombreArchivo, resumenEstudio, tablaDeVista, tablaSinConsenso, type TablaVista, type VistaExportable,
} from './card-sorting-export';

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

export { precargarPdf as precargarEstudioPdf } from '../../shared/utils/pdf';

export async function exportarEstudioPdf(data: CardSortingAnalytics, vistas: VistaExportable[], alcance: 'vista' | 'todas'): Promise<void> {
  const { pdfMake, brand } = await cargarPdfMake();
  const tablas = vistas.flatMap((vista) => {
    const tabla = tablaDeVista(vista, data);
    const sinConsenso = vista === 'cards' ? tablaSinConsenso(data) : null;
    return sinConsenso ? [tabla, sinConsenso] : [tabla];
  });
  const etiqueta = alcance === 'todas' ? 'todas-las-vistas' : vistas[0];
  const ahora = new Date();
  await pdfMake.createPdf(buildEstudioPdfDefinition(data, tablas, alcance === 'todas' ? 'TODAS LAS VISTAS' : tablas[0].titulo.toUpperCase(), ahora, brand)).download(nombreArchivo(data.estudio.nombre, etiqueta, 'pdf'));
}
