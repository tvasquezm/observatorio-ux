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
    expect(pdf).toContain('Estudio cerrado');
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
