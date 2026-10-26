import { describe, expect, it } from 'vitest';
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { analiticaHeuristica, evaluacionesVigentes } from './analitica';

const hallazgo = (severidad: number, decision: 'ACEPTADO' | 'DESCARTADO' = 'ACEPTADO') => ({ severidad, decision });
const evaluacion = (id: string, fase: string, hallazgos: ReturnType<typeof hallazgo>[], anteriorId: string | null = null) =>
  ({ id, fase, anteriorId, informe: hallazgos.length || fase === 'FINALIZADA' ? { consenso: { hallazgos } } : null }) as unknown as EvaluacionFlujo;

describe('analiticaHeuristica', () => {
  it('cuenta solo problemas aceptados de la versión más reciente', () => {
    const lista = [
      evaluacion('v1', 'FINALIZADA', [hallazgo(4), hallazgo(2)]),
      evaluacion('v2', 'FINALIZADA', [hallazgo(3), hallazgo(3), hallazgo(1, 'DESCARTADO')], 'v1'),
      evaluacion('borrador', 'BORRADOR', []),
    ];
    expect(evaluacionesVigentes(lista).map((e) => e.id)).toEqual(['v2', 'borrador']);
    const r = analiticaHeuristica(lista);
    expect(r).toMatchObject({ sesionesTotal: 2, sesionesCompletadas: 1, hallazgosTotal: 2 });
    expect(r.porSeveridad[3]).toEqual({ severidad: 3, count: 2, porcentaje: 100 });
  });

  it('sin evaluaciones devuelve ceros', () => {
    const r = analiticaHeuristica([]);
    expect(r.hallazgosTotal).toBe(0);
    expect(r.porSeveridad.map((s) => s.count)).toEqual([0, 0, 0, 0, 0]);
  });
});
