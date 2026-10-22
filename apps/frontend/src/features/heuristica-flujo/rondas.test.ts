import { describe, expect, it } from 'vitest';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { CriterioFlujo } from '@observatorio-ux/shared-types';
import { armarRondas } from './rondas';

const origen = { autor: 'a', version: '1' } as CriterioFlujo['origen'];
const criterios = (...categorias: string[]): CriterioFlujo[] => categorias.map((categoria, i) => ({ id: `c${i + 1}`, nombre: `Criterio ${i + 1}`, descripcion: '', categoria, origen, peso: 1 }));
const ids = (r: ReturnType<typeof armarRondas>) => r.map(x => x.criterios.map(c => c.id));

describe('armarRondas', () => {
  it('sin criterios no hay rondas', () => {
    expect(armarRondas([])).toEqual([]);
  });
  it('pocos criterios quedan en una sola ronda', () => {
    expect(ids(armarRondas(criterios('A', 'B')))).toEqual([['c1', 'c2']]);
  });
  it('junta categorías seguidas hasta 4 criterios y mantiene el orden', () => {
    const r = armarRondas(criterios('A', 'A', 'B', 'C', 'C', 'C', 'D', 'D', 'D'));
    expect(ids(r)).toEqual([['c1', 'c2', 'c3'], ['c4', 'c5', 'c6'], ['c7', 'c8', 'c9']]);
    expect(r[0].categorias).toEqual(['A', 'B']);
  });
  it('una categoría de más de 4 se parte en bloques de 4', () => {
    expect(ids(armarRondas(criterios('A', 'A', 'A', 'A', 'A', 'A', 'A', 'A')))).toEqual([['c1', 'c2', 'c3', 'c4'], ['c5', 'c6', 'c7', 'c8']]);
  });
  it('un resto de menos de 3 se une a la ronda anterior', () => {
    const r = armarRondas(criterios('A', 'A', 'A', 'A', 'A', 'A'));
    expect(ids(r)).toEqual([['c1', 'c2', 'c3', 'c4', 'c5', 'c6']]);
    expect(r[0].categorias).toEqual(['A']);
  });
  it('un resto de 3 se queda como ronda propia', () => {
    expect(ids(armarRondas(criterios('A', 'A', 'A', 'A', 'B', 'B', 'B')))).toEqual([['c1', 'c2', 'c3', 'c4'], ['c5', 'c6', 'c7']]);
  });
  it('toda metodología del catálogo queda repartida sin perder ni repetir criterios', () => {
    for (const m of METODOLOGIAS_HEURISTICAS) {
      const r = armarRondas(m.criterios);
      expect(r.every(x => x.criterios.length > 0), m.id).toBe(true);
      expect(r.flatMap(x => x.criterios.map(c => c.id)).sort(), m.id).toEqual(m.criterios.map(c => c.id).sort());
    }
  });
});
