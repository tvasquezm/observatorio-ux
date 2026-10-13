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
  it('admite escala propia opcional por criterio y rechaza una inválida', () => {
    expect(validar(configuracionSchema, config()).metodologia.criterios[0].escala).toBeUndefined();
    const c = config();
    (c.metodologia.criterios[0] as Record<string, unknown>).escala = { tipo: 'categorica', sentido: 'sin_orden', fuente: 'Checklist propio', niveles: [{ id: 'si', etiqueta: 'Sí', significado: 'Cumple' }, { id: 'no', etiqueta: 'No', significado: 'No cumple' }] };
    expect(validar(configuracionSchema, c).metodologia.criterios[0].escala?.niveles).toHaveLength(2);
    (c.metodologia.criterios[0] as Record<string, unknown>).escala = { tipo: 'numerica', sentido: 'mayor_mejor', fuente: 'x', niveles: [{ id: 'a', etiqueta: 'A', significado: 'A' }] };
    expect(() => validar(configuracionSchema, c)).toThrow();
  });
  it('admite trabajo incompleto sin campos de autoría y valida coordenadas', () => {
    expect(validar(trabajoSchema, { revision: 0, respuestas: [], hallazgos: [] }).respuestas).toEqual([]);
    expect(() => validar(trabajoSchema, { revision: 0, respuestas: [], hallazgos: [], evaluadorId: 'otro' })).toThrow();
    expect(() => validar(anotacionesSchema, { revision: 0, anotaciones: [{ id: 'a', tipo: 'texto', x: -1, y: 0, x2: 1, y2: 1, color: '#000000', texto: 'a' }] })).toThrow();
  });
  it('admite favorable opcional en los niveles, valida el checklist del catálogo y rechaza valores no booleanos', () => {
    const c = config();
    const escala = (favorable: unknown) => ({ tipo: 'categorica', sentido: 'sin_orden', fuente: 'Checklist propio', niveles: [{ id: 'si', etiqueta: 'Sí', significado: 'Cumple', favorable }, { id: 'no', etiqueta: 'No', significado: 'No cumple' }] });
    (c.metodologia.criterios[0] as Record<string, unknown>).escala = escala(true);
    expect(validar(configuracionSchema, c).metodologia.criterios[0].escala?.niveles[0].favorable).toBe(true);
    (c.metodologia.criterios[0] as Record<string, unknown>).escala = escala('si');
    expect(() => validar(configuracionSchema, c)).toThrow();
    const checklist = structuredClone(METODOLOGIAS_HEURISTICAS.find(m => m.id === 'hassan-checklist-2003')!);
    expect(validar(configuracionSchema, { ...config(), metodologia: checklist }).metodologia.escala.niveles.map(n => n.favorable)).toEqual([true, false]);
  });
});
