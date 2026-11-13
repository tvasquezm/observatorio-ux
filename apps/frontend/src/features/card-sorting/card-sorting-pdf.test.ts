import { describe, expect, it } from 'vitest';
import type { CardSortingAnalytics } from './api/card-sorting.api';
import { buildEstudioPdfDefinition } from './card-sorting-pdf';
import type { TablaVista } from './card-sorting-export';

const data = {
  estudio: { id: 'e1', proyectoId: 'p1', nombre: 'Estudio demo', cerrado: true, createdAt: '2026-10-02' },
  participantesCount: 4,
  cardsCount: 1,
  acuerdoGlobal: 60,
  categorias: ['A'],
  muestra: 'baja',
  umbrales: { consenso: 50, muestraMinima: 15, muestraEstable: 30 },
} as unknown as CardSortingAnalytics;

const fecha = new Date('2026-10-04T12:00:00Z');

function tabla(parcial: Partial<TablaVista>): TablaVista {
  return { vista: 'cards', titulo: 'Tarjetas', descripcion: 'desc', columnas: ['Tarjeta', 'Estado'], filas: [['Becas', 'Consenso']], ...parcial };
}

describe('buildEstudioPdfDefinition', () => {
  it('portada con el nombre del estudio y los datos de resumen', () => {
    const pdf = JSON.stringify(buildEstudioPdfDefinition(data, [tabla({})], 'Tarjetas', fecha));
    expect(pdf).toContain('RESULTADOS DE CARD SORTING');
    expect(pdf).toContain('Estudio demo');
    expect(pdf).toContain('Card sorting cerrado');
    expect(pdf).toContain('PARTICIPANTES');
    expect(pdf).toContain('Becas');
  });

  it('vista con barras agrega la columna Distribución', () => {
    const pdf = JSON.stringify(buildEstudioPdfDefinition(data, [tabla({ barras: [[{ pct: 75, color: 1 }]] , columnas: ['Tarjeta', 'Estado', 'Categoría principal', '%', 'Participantes', 'Otras'], filas: [['Becas', 'Consenso', 'A', 75, 3, '']] })], 'Tarjetas', fecha));
    expect(pdf).toContain('Distribución');
    expect(pdf).toContain('"canvas"');
  });

  it('matriz ancha va apaisada; con demasiadas columnas remite al CSV', () => {
    const columnas = Array.from({ length: 20 }, (_, i) => `C${i}`);
    const ancha = JSON.stringify(buildEstudioPdfDefinition(data, [tabla({ ancha: true, columnas, filas: [columnas] })], 'x', fecha));
    expect(ancha).toContain('"pageOrientation":"landscape"');
    expect(ancha).toContain('Descárgala como CSV');
    const media = Array.from({ length: 8 }, (_, i) => `Categoría muy larga ${i}`);
    const abreviada = JSON.stringify(buildEstudioPdfDefinition(data, [tabla({ ancha: true, columnas: ['Tarjeta', ...media], filas: [['Becas', ...media.map(() => 1)]] })], 'x', fecha));
    expect(abreviada).toContain('Categoría muy…');
    expect(abreviada).toContain('el CSV los incluye completos');
  });

  it('sin filas avisa que no hay datos', () => {
    expect(JSON.stringify(buildEstudioPdfDefinition(data, [tabla({ filas: [] })], 'x', fecha))).toContain('Sin datos para esta vista');
  });

  it('varias vistas: cada una empieza en página nueva', () => {
    const pdf = JSON.stringify(buildEstudioPdfDefinition(data, [tabla({}), tabla({ titulo: 'Otra' })], 'TODAS', fecha));
    expect(pdf.match(/"pageBreak":"before"/g)).toHaveLength(2);
  });
});

describe('opciones del PDF de resultados', () => {
  it('omite portada y resumen cuando no están seleccionados', () => {
    const pdf = buildEstudioPdfDefinition(data, [tabla({})], 'x', fecha, undefined, { resumen: false });
    expect(JSON.stringify(pdf.content)).not.toContain('RESULTADOS DE CARD SORTING');
    expect(JSON.stringify(pdf.content)).toContain('Tarjetas');
  });
  it('puede continuar secciones de la misma orientación sin saltos', () => {
    const pdf = buildEstudioPdfDefinition(data, [tabla({}), tabla({ titulo: 'Otra' })], 'x', fecha, undefined, { separarSecciones: false });
    expect(JSON.stringify(pdf.content)).not.toContain('"pageBreak":"before"');
  });
  it('el blanco y negro convierte colores de tablas y cabecera sin cambiar el texto', () => {
    const pdf = buildEstudioPdfDefinition(data, [tabla({})], 'x', fecha, undefined, { color: false });
    const header = typeof pdf.header === 'function' ? pdf.header(1, 2, { width: 595, height: 842, orientation: 'portrait' }) : pdf.header;
    const serializado = JSON.stringify([pdf.content, pdf.styles, header]);
    const colores = serializado.match(/#[a-fA-F0-9]{6}/g) ?? [];
    expect(colores.length).toBeGreaterThan(0);
    expect(colores.every(c => c.slice(1, 3) === c.slice(3, 5) && c.slice(3, 5) === c.slice(5, 7))).toBe(true);
  });
  it('el tamaño de texto del PDF no depende de la escala de la aplicación', () => {
    const normal = buildEstudioPdfDefinition(data, [tabla({})], 'x', fecha);
    document.documentElement.dataset.fontSize = 'huge';
    expect(JSON.stringify(buildEstudioPdfDefinition(data, [tabla({})], 'x', fecha))).toBe(JSON.stringify(normal));
    delete document.documentElement.dataset.fontSize;
  });
});
