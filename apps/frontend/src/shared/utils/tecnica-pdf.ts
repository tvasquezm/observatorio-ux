import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { TECNICAS_INFO, type TecnicaId } from '../content/tecnicas-info';
import { cargarPdfMake, INK, paragraph, title } from './pdf';

export function buildExplicacionPdfDefinition(tecnica: TecnicaId): TDocumentDefinitions {
  const info = TECNICAS_INFO[tecnica].explicacionCompleta;
  return {
    info: { title: info.titulo, creator: 'UXLab Observatorio' },
    pageSize: 'A4', pageMargins: [44, 44, 44, 44],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.25, color: INK },
    content: [
      { text: info.titulo, fontSize: 22, bold: true, margin: [0, 0, 0, 16] },
      ...info.secciones.flatMap((s): Content[] => [
        title(s.encabezado), ...(s.parrafos ?? []).map(paragraph),
        ...(s.pasos ? [{ ol: [...s.pasos], margin: [0, 0, 0, 8] } as Content] : []),
      ]),
    ],
    styles: { subheading: { fontSize: 14, bold: true, color: INK } },
  };
}

export async function descargarExplicacionPdf(tecnica: TecnicaId) {
  const { pdfMake } = await cargarPdfMake();
  await pdfMake.createPdf(buildExplicacionPdfDefinition(tecnica)).download(`explicacion-${tecnica}.pdf`);
}
