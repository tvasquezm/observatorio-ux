import { configuracionSchema, anotacionesSchema, trabajoSchema, validar } from './heuristica-flujo.schemas.js';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';

describe('Límites de entrada del flujo', () => {
  const config = () => ({ nombre: 'Evaluación', producto: { clave: 'web', nombre: 'Web', version: '1', url: '', dispositivo: 'PC' }, objetivo: '', tareas: '', pantallas: '', exclusiones: '', metodologia: structuredClone(METODOLOGIAS_HEURISTICAS[0]), evaluadorIds: ['a'], lectorIds: [] });
  it('admite alcance pendiente y uno/cinco expertos en borrador', () => {
    expect(validar(configuracionSchema, config()).evaluadorIds).toHaveLength(1);
    expect(validar(configuracionSchema, { ...config(), evaluadorIds: ['a','b','c','d','e'] }).evaluadorIds).toHaveLength(5);
  });
  it('rechaza IDs repetidos, seis expertos, pesos inválidos y campos desconocidos', () => {
    for (const cambios of [{ evaluadorIds: ['a','a'] }, { evaluadorIds: ['a','b','c','d','e','f'] }, { administrador: true }]) expect(() => validar(configuracionSchema, { ...config(), ...cambios })).toThrow();
    const c = config(); c.metodologia.criterios[0].peso = 0;
    expect(() => validar(configuracionSchema, c)).toThrow();
  });
  it('admite trabajo incompleto sin campos de autoría y valida coordenadas', () => {
    expect(validar(trabajoSchema, { revision: 0, respuestas: [], hallazgos: [] }).respuestas).toEqual([]);
    expect(() => validar(trabajoSchema, { revision: 0, respuestas: [], hallazgos: [], evaluadorId: 'otro' })).toThrow();
    expect(() => validar(anotacionesSchema, { revision: 0, anotaciones: [{ id: 'a', tipo: 'texto', x: -1, y: 0, x2: 1, y2: 1, color: '#000000', texto: 'a' }] })).toThrow();
  });
});
