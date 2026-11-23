import { describe, expect, it } from 'vitest';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { MAX_FASES_POR_TABLERO, journeyVisual, personaVisual, svgCurva } from './pdf-visual';

const journey = {
  perfilUsuario: { nombre: 'Camila', rol: 'Estudiante' },
  objetivo: 'Inscribir ramos', eventoInicio: 'Abre el portal',
  fases: [
    { nombre: 'Ingreso', emocion: 'Neutral' as const, actividades: ['Entra'], touchpoints: ['Portal'], pensamientos: '¿Dónde?', dificultades: ['Lento'], ganancias: [], oportunidades: ['Atajo'] },
    { nombre: 'Elección', emocion: 'Negativa' as const, actividades: ['Busca'], touchpoints: [], pensamientos: '', dificultades: ['Confuso'], ganancias: [], oportunidades: [] },
    { nombre: 'Cierre', emocion: 'Positiva' as const, actividades: ['Confirma'], touchpoints: ['Correo'], pensamientos: 'Listo', dificultades: [], ganancias: ['Rápido'], oportunidades: [] },
  ],
};

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

describe('PDF visual de técnicas (F40)', () => {
  it('la curva usa un punto por fase con el color de su emoción', () => {
    const svg = svgCurva(['Neutral', 'Negativa', 'Positiva']);
    expect(svg).toMatch(/^<svg /);
    expect(svg.match(/<circle /g)).toHaveLength(3);
    expect(svg).toContain('d="M 50 56 C');
  });

  it('el tablero tiene una columna por fase y los mismos carriles que la página', () => {
    const [, , tablero] = journeyVisual(journey) as [Content, Content, { table: { widths: unknown[]; body: unknown[][] } }];
    expect(tablero.table.widths).toHaveLength(4);
    const etiquetas = tablero.table.body.map(f => { const c = f[0] as { text?: string; stack?: { text: string }[] }; return c.text ?? c.stack?.[0].text; });
    expect(etiquetas).toEqual(['Fase', 'Emoción', '', 'Actividades', 'Puntos de contacto', 'Pensamientos', 'Dificultades / puntos de dolor', 'Ganancias / aspectos positivos', 'Oportunidades de mejora']);
  });

  it('el tablero cabe en el ancho útil de A4 horizontal, contando padding y bordes', () => {
    for (const n of [1, 2, 3, 4]) {
      const fases = Array.from({ length: n }, (_, i) => ({ ...journey.fases[i % 3], nombre: `F${i}` }));
      const [, , tablero] = journeyVisual({ ...journey, fases }) as [Content, Content, { table: { widths: number[] } }];
      const total = tablero.table.widths.reduce((a, b) => a + b, 0) + (n + 1) * 10 + (n + 2);
      expect(total, `${n} fases`).toBeLessThanOrEqual(842 - 108);
    }
  });

  it(`con más de ${MAX_FASES_POR_TABLERO} fases el mapa continúa en otro tablero, en una página nueva`, () => {
    const fases = Array.from({ length: 7 }, (_, i) => ({ ...journey.fases[i % 3], nombre: `F${i + 1}` }));
    const contenido = journeyVisual({ ...journey, fases }) as Array<{ text?: string; table?: { widths: unknown[] }; pageBreak?: string }>;
    const tableros = contenido.filter(c => c.table && c.table.widths.length > 2);
    expect(tableros.map(t => t.table!.widths.length - 1)).toEqual([4, 3]);
    expect(contenido.find(c => c.text === 'Fases 5 a 7 de 7')?.pageBreak).toBe('before');
  });

  it('sin foto incrustable usa las iniciales', () => {
    const contenido = JSON.stringify(personaVisual({ nombreCompleto: 'Ana Pérez', fotografiaUrl: 'https://ejemplo.cl/foto.webp' }));
    expect(contenido).toContain('"AP"');
    expect(contenido).not.toContain('"image"');
  });

  it('pdfmake genera el PDF con el tablero (SVG y columnas combinadas) y la tarjeta', async () => {
    expect(await renderiza(journeyVisual(journey), 'landscape')).toBe('%PDF-');
    const siete = Array.from({ length: 7 }, (_, i) => ({ ...journey.fases[i % 3], nombre: `Fase ${i + 1}` }));
    expect(await renderiza(journeyVisual({ ...journey, fases: siete }), 'landscape')).toBe('%PDF-');
    expect(await renderiza(personaVisual({ nombreCompleto: 'Ana Pérez', edad: 21, ocupacion: 'Estudiante', objetivos: ['Titularse'], frustraciones: ['Trámites'] }), 'portrait')).toBe('%PDF-');
  }, 30_000);
});
