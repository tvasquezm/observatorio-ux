import { describe, expect, it } from 'vitest';
import type { HallazgoHeuristica } from './api/evaluacion-heuristica.api';
import { SIN_RESPONSABLE, resumirSesion, tieneEvidencia } from './heuristica-resumen';

const h = (over: Partial<HallazgoHeuristica>): HallazgoHeuristica => ({
  id: 'x', heuristicaId: 'H1', severidad: 2, descripcion: 'd', evidencia: null, recomendacion: null,
  registradoEn: '2026-10-01T00:00:00.000Z', ...over,
});

describe('resumirSesion', () => {
  it('sin hallazgos: ceros y promedio nulo', () => {
    expect(resumirSesion([])).toEqual({ total: 0, criticos: 0, promedio: null, porHeuristica: [], sinEvidencia: 0, porResponsable: [] });
  });

  it('cuenta críticos (3 y 4) y promedia con un decimal', () => {
    const r = resumirSesion([h({ severidad: 4 }), h({ severidad: 3 }), h({ severidad: 0 })]);
    expect(r.total).toBe(3);
    expect(r.criticos).toBe(2);
    expect(r.promedio).toBe(2.3);
  });

  it('ordena heurísticas por cantidad y, a igual cantidad, por el orden del catálogo; el id legado va al final', () => {
    const r = resumirSesion([
      h({ heuristicaId: 'H10' }), h({ heuristicaId: 'H2' }), h({ heuristicaId: 'consistencia' }),
      h({ heuristicaId: 'H4' }), h({ heuristicaId: 'H4' }),
    ]);
    expect(r.porHeuristica.map((p) => [p.heuristicaId, p.count])).toEqual([['H4', 2], ['H2', 1], ['H10', 1], ['consistencia', 1]]);
  });

  it('agrupa por responsable y rotula los hallazgos legados sin responsable', () => {
    const r = resumirSesion([
      h({ responsable: { id: 'u1', nombre: 'Ana' } }), h({ responsable: { id: 'u1', nombre: 'Ana' } }),
      h({ responsable: { id: 'u2', nombre: 'Beto' } }), h({}),
    ]);
    expect(r.porResponsable).toEqual([{ nombre: 'Ana', count: 2 }, { nombre: 'Beto', count: 1 }, { nombre: SIN_RESPONSABLE, count: 1 }]);
  });

  it('cuenta como sin evidencia solo si faltan texto, enlace y captura', () => {
    expect(tieneEvidencia(h({ evidencia: '  ' }))).toBe(false);
    expect(tieneEvidencia(h({ evidencia: 'texto' }))).toBe(true);
    expect(tieneEvidencia(h({ evidenciaUrl: 'https://a.cl' }))).toBe(true);
    expect(tieneEvidencia(h({ evidenciaArchivoId: 'f1' }))).toBe(true);
    const r = resumirSesion([h({}), h({ evidencia: 'ok' }), h({ evidenciaArchivoId: 'f1' })]);
    expect(r.sinEvidencia).toBe(1);
  });
});
