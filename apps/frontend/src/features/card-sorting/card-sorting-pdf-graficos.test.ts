import { describe, expect, it } from 'vitest';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { colorCalor, dendrogramaPdf, mapaCalor } from './card-sorting-pdf-graficos';

async function renderiza(content: Content[], orientacion: 'portrait' | 'landscape') {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const vfs = await import('pdfmake/build/vfs_fonts');
  const pdfMake = (pdfMakeModule as unknown as { default: typeof pdfMakeModule }).default ?? pdfMakeModule;
  const fuentes = (vfs as unknown as { default?: Record<string, string> }).default ?? (vfs as unknown as Record<string, string>);
  (pdfMake as unknown as { addVirtualFileSystem: (v: unknown) => void }).addVirtualFileSystem(fuentes);
  const doc: TDocumentDefinitions = { pageSize: 'A4', pageOrientation: orientacion, pageMargins: [54, 72, 54, 54], content };
  const buffer = await (pdfMake as unknown as { createPdf: (d: TDocumentDefinitions) => { getBuffer: () => Promise<Uint8Array> } }).createPdf(doc).getBuffer();
  return Buffer.from(buffer).subarray(0, 5).toString();
}

const tarjetas = Array.from({ length: 30 }, (_, i) => `Tarjeta número ${i + 1}`);
// Tres bloques de tarjetas muy parecidas entre sí.
const similitud = tarjetas.map((_, i) => tarjetas.map((__, j) => (i === j ? 100 : Math.floor(i / 10) === Math.floor(j / 10) ? 80 - Math.abs(i - j) : 10)));

describe('gráficos de card sorting en el PDF', () => {
  it('el mapa de calor va de blanco al Azul Eléctrico de la marca', () => {
    expect(colorCalor(0)).toBe('#ffffff');
    expect(colorCalor(1)).toBe('#253ff6');
  });

  it('colorea cada celda según el valor, atenúa la diagonal y numera las columnas', () => {
    const [tabla] = mapaCalor({ encabezado: 'Tarjeta', filas: ['A', 'B'], columnas: ['A', 'B'], valores: [[100, 40], [40, 100]], maximo: 100, diagonal: true, unidad: '%' }, 734) as Array<{ table: { body: Array<Array<{ text: string; fillColor?: string }>> } }>;
    const [encabezado, fila1] = tabla.table.body;
    expect(encabezado.map(c => c.text)).toEqual(['Tarjeta', '1', '2']);
    expect(fila1[0].text).toBe('1. A');
    expect(fila1[1]).toMatchObject({ text: '', fillColor: '#e6eaf1' });
    expect(fila1[2]).toMatchObject({ text: '40%', fillColor: colorCalor(0.4) });
  });

  it('con más columnas de las que se leen remite al CSV', () => {
    const muchas = Array.from({ length: 80 }, (_, i) => `T${i}`);
    const contenido = JSON.stringify(mapaCalor({ encabezado: 'Tarjeta', filas: muchas, columnas: muchas, valores: muchas.map(() => muchas.map(() => 10)), maximo: 100, diagonal: true }, 734));
    expect(contenido).toContain('CSV');
  });

  it('el dendrograma dibuja un trazo por unión y cabe en la página', () => {
    const [bloque] = dendrogramaPdf(tarjetas, similitud, 485, 626) as Array<{ columns: Array<{ svg?: string; table?: { body: unknown[] } }> }>;
    const svg = bloque.columns[1].svg!;
    expect(svg.match(/M[\d.]+ [\d.]+H/g)).toHaveLength(29);
    expect(Number(svg.match(/height="([\d.]+)"/)![1])).toBeLessThanOrEqual(626);
    expect(bloque.columns[0].table!.body).toHaveLength(30);
  });

  it('pdfmake genera el PDF con el mapa de calor y el dendrograma', async () => {
    const calor = mapaCalor({ encabezado: 'Tarjeta', filas: tarjetas, columnas: tarjetas, valores: similitud, maximo: 100, diagonal: true, unidad: '%' }, 734);
    expect(await renderiza(calor, 'landscape')).toBe('%PDF-');
    expect(await renderiza(dendrogramaPdf(tarjetas, similitud, 485, 626), 'portrait')).toBe('%PDF-');
  }, 30_000);
});
