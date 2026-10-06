import type { Content, TableCell } from 'pdfmake/interfaces';

export const INK = '#1f2d4a';
export const TEAL = '#3049b2';
export const MUTED = '#526a73';

export const textValue = (value: unknown): string => Array.isArray(value) ? value.join('\n') || 'No registrado' : value == null || value === '' ? 'No registrado' : String(value);
export const title = (text: string): Content => ({ text, style: 'subheading', margin: [0, 16, 0, 8], headlineLevel: 2 });
export const paragraph = (text: string): Content => ({ text, margin: [0, 0, 0, 8] });

export function table(headers: string[], rows: unknown[][], widths?: Array<string | number>, compact = false): Content {
  return {
    table: {
      headerRows: 1,
      widths: widths ?? headers.map(() => '*'),
      body: [
        headers.map((text) => ({ text, bold: true, color: '#ffffff', fillColor: INK, fontSize: compact ? 7 : 9 })),
        ...rows.map((row, index) => row.map((value) => {
          const fillColor = index % 2 ? '#ffffff' : '#f3f5f9';
          if (value && typeof value === 'object' && !Array.isArray(value)) return { ...(value as object), fillColor } as TableCell;
          return { text: textValue(value), fillColor, ...(compact ? { fontSize: 7.5 } : {}) };
        })),
      ],
    },
    layout: {
      hLineWidth: () => 0, vLineWidth: () => 0,
      paddingLeft: () => compact ? 4 : 9, paddingRight: () => compact ? 4 : 9,
      paddingTop: () => compact ? 3 : 6, paddingBottom: () => compact ? 3 : 6,
    },
    margin: [0, 0, 0, 12],
  };
}
