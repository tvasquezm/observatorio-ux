import type { Content, ContentCanvas, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

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
export const titleAccent = (): ContentCanvas => ({
  canvas: [{ type: 'line', x1: 0, y1: 2, x2: 28, y2: 2, lineWidth: 2, lineColor: TEAL }],
  margin: [0, 2, 0, 4],
});
export const title = (text: string): Content => ({
  stack: [{ text, style: 'subheading', headlineLevel: 2 }, titleAccent()],
  margin: [0, 16, 0, 8],
});
export const paragraph = (text: string): Content => ({ text, margin: [0, 0, 0, 8] });

export function table(headers: string[], rows: unknown[][], widths?: Array<string | number>, compact = false): ContentTable {
  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      widths: widths ?? headers.map(() => '*'),
      body: [
        headers.map((text) => ({ text, bold: true, color: '#ffffff', fillColor: INK, fontSize: compact ? 7 : 9 })),
        ...rows.map((row, index) => row.map((value, column) => {
          const fillColor = index % 2 ? '#ffffff' : '#f3f5f9';
          const style = { fillColor, ...(column === 0 ? { bold: true } : {}) };
          if (value && typeof value === 'object' && !Array.isArray(value)) return { ...value, ...style } as TableCell;
          return { text: textValue(value), ...style, ...(compact ? { fontSize: 7.5 } : {}) };
        })),
      ],
    },
    layout: {
      hLineWidth: (i, node) => i === 0 || i === node.table.body.length ? 0 : 0.5,
      hLineColor: () => '#d7dde7',
      vLineWidth: () => 0,
      paddingLeft: () => compact ? 4 : 9, paddingRight: () => compact ? 4 : 9,
      paddingTop: () => compact ? 4 : 7, paddingBottom: () => compact ? 4 : 7,
    },
    margin: [0, 0, 0, 12],
  };
}
