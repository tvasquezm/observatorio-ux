import { describe, expect, it } from 'vitest';
import { clusterPromedio, fusiones } from './card-sorting-cluster';

// A-B 80, A-C 20, B-C 40
const sim3 = [
  [100, 80, 20],
  [80, 100, 40],
  [20, 40, 100],
];

describe('clusterPromedio', () => {
  it('sin tarjetas no hay árbol; con una es una hoja', () => {
    expect(clusterPromedio([])).toBeNull();
    const hoja = clusterPromedio([[100]]);
    expect(hoja?.tarjetas).toEqual([0]);
    expect(hoja?.izq).toBeUndefined();
  });

  it('une primero el par más similar', () => {
    const raiz = clusterPromedio(sim3)!;
    const [primera] = fusiones(raiz);
    expect(primera.tarjetas.sort()).toEqual([0, 1]);
    expect(primera.distancia).toBe(20); // 100 − 80
  });

  it('usa enlace promedio (no el mínimo ni el máximo) al unir {A,B} con C', () => {
    const raiz = clusterPromedio(sim3)!;
    // promedio de distancias A-C (80) y B-C (60) = 70  -> similitud 30
    expect(raiz.distancia).toBe(70);
    expect(raiz.tarjetas).toHaveLength(3);
  });

  it('pondera por tamaño del grupo', () => {
    // A,B,C muy parecidas entre sí y D lejos de A, B pero cerca de C.
    const s = [
      [100, 90, 90, 0],
      [90, 100, 90, 0],
      [90, 90, 100, 60],
      [0, 0, 60, 100],
    ];
    const raiz = clusterPromedio(s)!;
    // d(D,{A,B,C}) = (100 + 100 + 40) / 3 = 80
    expect(raiz.distancia).toBeCloseTo(80, 6);
  });

  it('es determinista ante empates (menor índice primero)', () => {
    const iguales = [
      [100, 50, 50],
      [50, 100, 50],
      [50, 50, 100],
    ];
    const raiz = clusterPromedio(iguales)!;
    expect(fusiones(raiz)[0].tarjetas.sort()).toEqual([0, 1]);
    expect(raiz.tarjetas).toEqual([0, 1, 2]);
  });

  it('las fusiones salen en orden de paso y son n − 1', () => {
    const lista = fusiones(clusterPromedio(sim3));
    expect(lista.map((f) => f.paso)).toEqual([1, 2]);
  });

  it('maneja 100 tarjetas sin problema', () => {
    const n = 100;
    const s = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 100 : (i * j) % 101)));
    expect(fusiones(clusterPromedio(s))).toHaveLength(n - 1);
  });
});
