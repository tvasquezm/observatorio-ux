import type { Content, ContentText, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

export const INK = '#1f2d4a';
export const TEAL = '#3049b2';
export const MUTED = '#5c6b7f';

export const PDF_PAGE_MARGINS: [number, number, number, number] = [54, 72, 54, 54];
export const PDF_DEFAULT_STYLE = { font: 'LatinModern', fontSize: 11, lineHeight: 1.18, color: '#222222' };
export const PDF_STYLES: TDocumentDefinitions['styles'] = {
  coverTitle: { fontSize: 25, bold: true, lineHeight: 1.12, color: INK, alignment: 'center', margin: [0, 0, 0, 20] },
  sectionTitle: { fontSize: 19, bold: true, lineHeight: 1.15, color: INK, margin: [0, 0, 0, 10] },
  subheading: { fontSize: 14, bold: true, lineHeight: 1.15, color: INK },
  eyebrow: { fontSize: 9, bold: true, color: MUTED, characterSpacing: .3 },
};
export const keepHeadingsWithContent: TDocumentDefinitions['pageBreakBefore'] = (node, container) =>
  Boolean(node.headlineLevel && !container.getFollowingNodesOnPage().length);

export const textValue = (value: unknown): string => Array.isArray(value) ? value.join('\n') || 'No registrado' : value == null || value === '' ? 'No registrado' : String(value);
export const title = (text: string): ContentText => ({ text, style: 'subheading', margin: [0, 20, 0, 9], headlineLevel: 2 });
export const paragraph = (text: string): Content => ({ text, margin: [0, 0, 0, 8] });

export function table(headers: string[], rows: unknown[][], widths?: Array<string | number>, compact = false): Content {
  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      widths: widths ?? headers.map(() => '*'),
      body: [
        headers.map((text) => ({ text, bold: true, color: INK, fontSize: compact ? 8.5 : 10, lineHeight: 1.15 })),
        ...rows.map((row) => row.map((value) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) return value as TableCell;
          return { text: textValue(value), fontSize: compact ? 9 : 10.5 };
        })),
      ],
    },
    layout: {
      hLineWidth: (index, node) => index === 0 || index === node.table.body.length ? .8 : index === 1 ? .5 : 0,
      hLineColor: () => INK, vLineWidth: () => 0,
      paddingLeft: () => compact ? 4 : 7, paddingRight: () => compact ? 4 : 7,
      paddingTop: () => compact ? 5 : 7, paddingBottom: () => compact ? 5 : 7,
    },
    margin: [0, 0, 0, 12],
  };
}
