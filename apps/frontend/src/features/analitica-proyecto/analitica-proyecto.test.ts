import { describe, expect, it } from 'vitest';
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { coincidenciaEquipo, matrizPrioridad, pendientesProyecto, principiosIncumplidos, zona } from './analitica-proyecto';

const criterios = [{ id: 'c1', nombre: 'Visibilidad del estado', categoria: 'Nielsen' }, { id: 'c2', nombre: 'Prevención de errores', categoria: 'Nielsen' }];
const hallazgo = (id: string, severidad: number, prioridad: string, criterioIds: string[], decision = 'ACEPTADO') => ({ id, titulo: `Problema ${id}`, severidad, prioridad, criterioIds, decision });
const respuesta = (criterioId: string, valor: string | null, noAplica = false) => ({ criterioId, valor, noAplica });

function evaluacion(parcial: Partial<Record<string, unknown>> = {}): EvaluacionFlujo {
  const configuracion = { nombre: 'Portal', producto: { nombre: 'Portal' }, metodologia: { criterios } };
  return {
    id: 'e1', anteriorId: null, fase: 'FINALIZADA', configuracion, trabajos: [],
    informe: { configuracion, consenso: { hallazgos: [
      hallazgo('a', 4, 'URGENTE', ['c1']), hallazgo('b', 3, 'MEDIA', ['c1', 'c2']), hallazgo('c', 1, 'BAJA', ['c2']),
      hallazgo('d', 0, 'BAJA', ['c1']), hallazgo('e', 4, 'URGENTE', ['c1'], 'DESCARTADO'),
    ] } },
    ...parcial,
  } as unknown as EvaluacionFlujo;
}

describe('analítica del proyecto', () => {
  it('clasifica por zona: grave y urgente, grave o urgente, o el resto', () => {
    expect(zona(4, 'ALTA')).toBe('ya');
    expect(zona(3, 'BAJA')).toBe('planificar');
    expect(zona(1, 'URGENTE')).toBe('planificar');
    expect(zona(2, 'MEDIA')).toBe('vigilar');
  });

  it('la matriz solo cuenta problemas aceptados con severidad mayor a 0 y prioriza lo urgente', () => {
    const m = matrizPrioridad([evaluacion()]);
    expect(m.total).toBe(3);
    expect(m.porZona).toEqual({ ya: 1, planificar: 1, vigilar: 1 });
    expect(m.arreglarYa.map(p => p.titulo)).toEqual(['Problema a']);
    expect(m.filas[0].celdas[0]).toMatchObject({ prioridad: 'URGENTE', zona: 'ya' });
    expect(m.filas[0].celdas[0].problemas).toHaveLength(1);
  });

  it('ordena los principios por cantidad de problemas, con su nombre', () => {
    expect(principiosIncumplidos([evaluacion()])).toEqual([
      { nombre: 'Prevención de errores', categoria: 'Nielsen', problemas: 2 },
      { nombre: 'Visibilidad del estado', categoria: 'Nielsen', problemas: 2 },
    ]);
  });

  it('la coincidencia compara solo criterios con dos o más respuestas', () => {
    const trabajos = [
      { respuestas: [respuesta('c1', 'cumple'), respuesta('c2', 'no'), respuesta('c3', 'si')] },
      { respuestas: [respuesta('c1', 'cumple'), respuesta('c2', 'si'), respuesta('c3', null, true)] },
    ];
    expect(coincidenciaEquipo([evaluacion({ trabajos })])).toEqual([{ evaluacion: 'Portal', evaluadores: 2, comparables: 2, coincidencia: 50 }]);
    expect(coincidenciaEquipo([evaluacion()])).toEqual([]);
  });

  it('lista primero lo que falta y luego los avisos concretos', () => {
    const enCurso = evaluacion({ fase: 'EN_EVALUACION', avanceEquipo: [{ nombre: 'Ana', entregadoEn: null }, { nombre: 'Beto', entregadoEn: '2026-11-01' }] });
    const lista = pendientesProyecto({ personas: 2, journeys: 1, momentos: 0, estudios: [{ nombre: 'Menú', respuestasCount: 4 }], evaluaciones: [enCurso] });
    expect(lista.map(p => p.tipo)).toEqual(['falta', 'aviso', 'aviso', 'aviso']);
    expect(lista[0].texto).toContain('momentos críticos');
    expect(lista.map(p => p.texto)).toContain('El card sorting "Menú" tiene 4 respuestas; se recomiendan al menos 15.');
    expect(lista.map(p => p.texto)).toContain('En "Portal" falta 1 revisión por entregar (Ana).');
  });
});

describe('trabajo en curso de la persona', () => {
  it('pide terminar la revisión propia o revisar el acuerdo, y omite lo ajeno', async () => {
    const { trabajoEnCurso } = await import('./analitica-proyecto');
    const base = { anteriorId: null, coordinadorId: 'otro', consenso: { aprobadoPor: [] }, trabajos: [{ evaluadorId: 'yo', entregadoEn: null }] };
    const conf = (nombre: string, evaluadorIds: string[]) => ({ nombre, producto: { nombre }, evaluadorIds });
    const lista = trabajoEnCurso([
      { ...base, id: '1', fase: 'EN_EVALUACION', configuracion: conf('Portal', ['yo']) },
      { ...base, id: '2', fase: 'PENDIENTE_CONSENSO', configuracion: conf('App', ['yo']) },
      { ...base, id: '3', fase: 'EN_EVALUACION', configuracion: conf('Ajena', ['otro']) },
    ] as never, 'yo');
    expect(lista.map(p => p.texto)).toEqual(['Termina tu revisión de "Portal".', 'El equipo espera tu revisión del acuerdo en "App".']);
  });
});
