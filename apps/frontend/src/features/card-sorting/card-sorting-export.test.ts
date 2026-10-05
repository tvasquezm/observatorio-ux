import { describe, expect, it } from 'vitest';
import type { CardSortingAnalytics } from './api/card-sorting.api';
import { nombreArchivo, tablaDeVista } from './card-sorting-export';

const data = {
  estudio: { id: 'e1', proyectoId: 'p1', nombre: 'Estudio demo', cerrado: false, createdAt: '2026-10-02' },
  participantesCount: 4,
  cardsCount: 3,
  acuerdoGlobal: 60,
  tarjetas: ['Becas', 'Libro'],
  matrizSimilitud: [[100, 40], [40, 100]],
  frecuenciaPorCategoria: [{ nombre: 'A', count: 3, porcentaje: 75 }],
  umbrales: { consenso: 50, muestraMinima: 15, muestraEstable: 30 },
  categorias: ['A', 'B'],
  muestra: 'baja',
  resultsMatrix: { categorias: ['A', 'B'], filas: [{ tarjeta: 'Becas', valores: [3, 1] }] },
  popularPlacementsMatrix: { categorias: ['A', 'B'], filas: [{ tarjeta: 'Becas', valores: [75, 25] }] },
  porCarta: [
    { tarjeta: 'Becas', categoriasCount: 2, categorias: [{ nombre: 'A', frecuencia: 3 }, { nombre: 'B', frecuencia: 1 }] },
    { tarjeta: 'Libro', categoriasCount: 2, categorias: [{ nombre: 'A', frecuencia: 2 }, { nombre: 'B', frecuencia: 2 }] },
    { tarjeta: 'Nueva', categoriasCount: 0, categorias: [] },
  ],
  porCategoria: [{ nombre: 'A', cardsCount: 2, cartas: [{ tarjeta: 'Becas', frecuencia: 3 }, { tarjeta: 'Libro', frecuencia: 2 }], subcategorias: [] }],
  participantes: [{ orden: 1, categoriasCount: 2, grupos: [{ categoria: 'A', tarjetas: ['Becas', 'Libro'] }, { categoria: 'B', tarjetas: ['Nueva'] }] }],
  preguntas: [
    { id: 'q', texto: '¿Por qué?', orden: 1, respuestas: ['x'] },
    { id: 'r', texto: 'Otra', orden: 2, respuestas: [] },
  ],
} as unknown as CardSortingAnalytics;

describe('tablaDeVista', () => {
  it('tarjetas: estado, categoría principal, porcentaje y otras categorías', () => {
    const tabla = tablaDeVista('cards', data);
    expect(tabla.filas).toEqual([
      ['Becas', 'Consenso', 'A', 75, 3, 'B 25%'],
      ['Libro', 'Sin consenso', 'A', 50, 2, 'B 50%'],
      ['Nueva', 'Sin datos', '', '', '', ''],
    ]);
    expect(tabla.barras).toHaveLength(3);
  });

  it('categorías: una fila por tarjeta con su nivel de acuerdo', () => {
    expect(tablaDeVista('categories', data).filas).toEqual([
      ['A', '', 'Becas', 75, 3, 'Consenso'],
      ['A', '', 'Libro', 50, 2, 'Bajo acuerdo'],
    ]);
  });

  it('matrices: encabezado con unidad; ancha solo con más de 6 columnas', () => {
    expect(tablaDeVista('results', data).columnas).toEqual(['Tarjeta (cantidad)', 'A', 'B']);
    expect(tablaDeVista('popular', data).columnas[0]).toBe('Tarjeta (% participantes)');
    expect(tablaDeVista('similarity', data).filas).toEqual([['Becas', 100, 40], ['Libro', 40, 100]]);
    expect(tablaDeVista('results', data).ancha).toBe(false);
    const muchas = { ...data, resultsMatrix: { categorias: ['1', '2', '3', '4', '5', '6', '7'], filas: [] } } as unknown as CardSortingAnalytics;
    expect(tablaDeVista('results', muchas).ancha).toBe(true);
  });

  it('dendrograma: pasos con grupos y similitud', () => {
    expect(tablaDeVista('dendrogram', data).filas).toEqual([[1, 'Becas', 'Libro', 40]]);
  });

  it('participantes: una fila por grupo', () => {
    expect(tablaDeVista('participants', data).filas).toEqual([
      ['Participante 1', 'A', 'Becas · Libro'],
      ['Participante 1', 'B', 'Nueva'],
    ]);
  });

  it('respuestas: una fila por respuesta y aviso si no hay', () => {
    expect(tablaDeVista('answers', data).filas).toEqual([['¿Por qué?', 'x'], ['Otra', '(sin respuestas)']]);
  });
});

describe('nombreArchivo', () => {
  it('slug sin tildes ni símbolos', () => {
    expect(nombreArchivo('Estudio: Biblioteca ñandú!', 'cards', 'csv')).toBe('card-sorting-estudio-biblioteca-nandu-cards.csv');
  });

  it('nombre vacío usa "estudio"', () => {
    expect(nombreArchivo('???', 'todas-las-vistas', 'pdf')).toBe('card-sorting-estudio-todas-las-vistas.pdf');
  });
});
