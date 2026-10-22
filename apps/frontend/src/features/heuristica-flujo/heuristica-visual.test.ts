import { describe, expect, it } from 'vitest';
import type { FaseHeuristica } from '@observatorio-ux/shared-types';
import { procesoHeuristica } from './heuristica-visual';

const hechos = (fase: FaseHeuristica | null) => procesoHeuristica(fase).filter(s => s.done).map(s => s.id);

describe('procesoHeuristica', () => {
  it('siempre tiene los cuatro pasos en orden', () => {
    expect(procesoHeuristica(null).map(s => s.id)).toEqual(['preparar', 'revisar', 'acordar', 'informe']);
  });
  it('avanza con la fase de la revisión', () => {
    expect(hechos(null)).toEqual([]);
    expect(hechos('BORRADOR')).toEqual([]);
    expect(hechos('EN_EVALUACION')).toEqual(['preparar']);
    expect(hechos('PENDIENTE_CONSENSO')).toEqual(['preparar', 'revisar']);
    expect(hechos('CONSOLIDADA')).toEqual(['preparar', 'revisar', 'acordar']);
    expect(hechos('FINALIZADA')).toEqual(['preparar', 'revisar', 'acordar', 'informe']);
  });
});
