// apps/frontend/src/shared/utils/pdf.ts
//
// Exportación de resumen a PDF sin dependencias externas (mismo enfoque
// que el mockup de referencia: construye un PDF 1.4 mínimo a mano).
// No reemplaza un motor de reportes real — es un resumen de texto plano
// para bajar evidencia rápido desde cualquier vista.

function limpiar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/[()\\]/g, '\\$&');
}

export function exportarResumenPdf(titulo: string, lineas: string[]): void {
  const stream = [
    'BT',
    '/F1 16 Tf',
    '50 760 Td',
    `(${limpiar(titulo)}) Tj`,
    '/F1 11 Tf',
    ...lineas.flatMap((linea) => ['0 -22 Td', `(${limpiar(linea)}) Tj`]),
    'ET',
  ].join('\n');

  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let out = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objs.forEach((obj, i) => {
    offsets[i + 1] = out.length;
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, '0')} 00000 n `)
    .join('\n');
  out += `\ntrailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([out], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `observatorio-ux-${limpiar(titulo).toLowerCase().replace(/\s+/g, '-')}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
