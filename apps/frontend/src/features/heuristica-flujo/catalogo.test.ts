import { describe, expect, it } from 'vitest';
import {
  METODOLOGIAS_HEURISTICAS, copiarMetodologia, combinarMetodologias, resumirEvaluacion,
  comprobarCompatibilidad, detectarDiscrepancias,
} from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, ConsensoFlujo, DecisionCriterio, DecisionHallazgo, TrabajoFlujo } from '@observatorio-ux/shared-types';

function configuracion(): ConfiguracionFlujo {
  return {
    nombre: 'Compra', producto: { clave: 'tienda', nombre: 'Tienda', version: '1', url: 'https://tienda.test', dispositivo: 'Móvil' },
    objetivo: 'Comprar', tareas: 'Añadir y pagar', pantallas: 'Carro y pago', exclusiones: '',
    metodologia: copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]), evaluadorIds: ['e1', 'e2'], lectorIds: [],
  };
}
const vacio = (): ConsensoFlujo => ({ criterios: [], hallazgos: [], aprobadoPor: [] });
const respuesta = (criterioId: string, valor: string | null = 'cumple', noAplica = false): DecisionCriterio => ({ criterioId, valor, noAplica, motivo: noAplica ? 'Fuera del recorrido' : '', notas: '', justificacion: 'Revisión conjunta' });
const hallazgo = (id: string, decision: DecisionHallazgo['decision'] = 'ACEPTADO'): DecisionHallazgo => ({
  id, decision, criterioIds: ['nielsen10:1'], titulo: 'Estado ausente', pantalla: 'Pago', descripcion: 'Sin respuesta',
  recomendacion: 'Mostrar estado', severidad: 3, prioridad: 'ALTA', notas: '', evidenciaIds: [], origenIds: ['original'], justificacion: 'Acordado',
});

describe('catálogo y snapshots', () => {
  it('conserva las diez familias y fuentes versionadas protegidas', () => {
    expect(METODOLOGIAS_HEURISTICAS.map(m => [m.id, m.criterios.length])).toEqual([
      ['nielsen10', 10], ['shneiderman8', 8], ['tognazzini', 19], ['bastien-scapin', 18], ['gerhardt-powals', 10],
      ['hassan-montero-martin-fernandez', 11], ['bertini2006', 8], ['wcag22', 12], ['coga2021', 8], ['amershi2019', 18],
    ]);
    const ids = METODOLOGIAS_HEURISTICAS.flatMap(m => m.criterios.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of METODOLOGIAS_HEURISTICAS) {
      expect(m.protegida && Object.isFrozen(m.criterios[0].origen)).toBe(true);
      expect(m.fuente).toMatch(/^https:\/\//);
      expect(m.escala.fuente).toBe('Escala operativa de la plataforma');
      expect(m.criterios.every(c => c.origen.version === m.version && c.origen.autor === m.autor)).toBe(true);
    }
  });
  it('edita copias independientes sin alterar origen ni catálogo', () => {
    const original = METODOLOGIAS_HEURISTICAS[0];
    const copia = copiarMetodologia(original, 'propia', 'Mi revisión');
    copia.criterios[0].descripcion = 'Cambio';
    copia.escala.niveles[0].etiqueta = 'Otra';
    expect(copia.protegida).toBe(false);
    expect(copia.criterios[0].origen).toEqual(original.criterios[0].origen);
    expect(original.criterios[0].descripcion).not.toBe('Cambio');
    expect(original.escala.niveles[0].etiqueta).toBe('Cumple');
    expect(() => { original.criterios[0].nombre = 'Cambio'; }).toThrow();
  });
  it('conserva criterios en colisiones y explica escalas incompatibles', () => {
    const otro = copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]);
    otro.escala.tipo = 'ordinal';
    const mezcla = combinarMetodologias([METODOLOGIAS_HEURISTICAS[0], METODOLOGIAS_HEURISTICAS[0], otro]);
    expect(mezcla.criterios).toHaveLength(30);
    expect(new Set(mezcla.criterios.map(c => c.id)).size).toBe(30);
    expect(mezcla.criterios.every(c => c.origen.metodologiaId === 'nielsen10')).toBe(true);
    expect(mezcla.escala.tipo).toBe('categorica');
    expect(mezcla.ambito).toContain('Escalas distintas');
    mezcla.criterios[0].origen.version = 'Cambio local';
    expect(METODOLOGIAS_HEURISTICAS[0].criterios[0].origen.version).not.toBe('Cambio local');
    expect(() => combinarMetodologias([])).toThrow();
  });
});

describe('resumen del consenso', () => {
  it('distingue pendiente, no aplica justificado e inválido', () => {
    const config = configuracion(), consenso = vacio();
    consenso.criterios = [respuesta(config.metodologia.criterios[0].id), respuesta(config.metodologia.criterios[1].id, null, true), respuesta(config.metodologia.criterios[2].id, 'desconocido')];
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ evaluados: 1, pendientes: 8, noAplica: 1, indice: null, denominador: 0, formula: null });
    consenso.criterios[1].motivo = '';
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ pendientes: 9, noAplica: 0 });
  });
  it('no produce un cero cuando todo es no aplica', () => {
    const config = configuracion(), consenso = vacio();
    consenso.criterios = config.metodologia.criterios.map(c => respuesta(c.id, null, true));
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ evaluados: 0, pendientes: 0, noAplica: 10, indice: null, denominador: 0 });
  });
  it('pondera solo valores numéricos explícitos y muestra el denominador aplicable', () => {
    const config = configuracion(), consenso = vacio();
    config.metodologia.escala = { tipo: 'numerica', sentido: 'mayor_mejor', fuente: 'Rúbrica local explícita', formula: 'media_ponderada', niveles: [{ id: 'bajo', etiqueta: 'Bajo', significado: 'Mínimo', valor: 0 }, { id: 'alto', etiqueta: 'Alto', significado: 'Máximo', valor: 10 }] };
    config.metodologia.criterios[0].peso = 3;
    config.metodologia.criterios[1].peso = 1;
    consenso.criterios = [respuesta(config.metodologia.criterios[0].id, 'alto'), respuesta(config.metodologia.criterios[1].id, 'bajo'), respuesta(config.metodologia.criterios[2].id, null, true)];
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ evaluados: 2, pendientes: 7, noAplica: 1, indice: 7.5, denominador: 4, porCategoria: [{ id: 'bajo', etiqueta: 'Bajo', count: 1 }, { id: 'alto', etiqueta: 'Alto', count: 1 }] });
    config.metodologia.escala.tipo = 'ordinal';
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ indice: null, denominador: 0, formula: null });
    config.metodologia.escala.tipo = 'numerica';
    config.metodologia.criterios[0].peso = -1;
    expect(resumirEvaluacion(config, consenso).indice).toBeNull();
    config.metodologia.criterios[0].peso = 3;
    delete config.metodologia.escala.formula;
    expect(resumirEvaluacion(config, consenso).indice).toBeNull();
  });
  it('cuenta una sola vez hallazgos aceptados y no escoge decisiones duplicadas', () => {
    const config = configuracion(), consenso = vacio();
    consenso.hallazgos = [hallazgo('fusionado'), hallazgo('fusionado'), hallazgo('descartado', 'DESCARTADO'), hallazgo('pendiente', 'PENDIENTE')];
    consenso.criterios = [respuesta(config.metodologia.criterios[0].id), respuesta(config.metodologia.criterios[0].id, 'no_cumple')];
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ totalHallazgos: 1, porSeveridad: [0, 0, 0, 1, 0], evaluados: 0, pendientes: 10 });
  });
});

describe('comparación y discrepancias', () => {
  it('permite nuevas versiones del producto manteniendo alcance explícito', () => {
    const anterior = configuracion(), actual = configuracion();
    actual.producto.version = '2';
    expect(comprobarCompatibilidad(anterior, actual)).toEqual({ compatible: true, motivos: [] });
  });
  it.each(['objetivo', 'tareas', 'pantallas', 'exclusiones'] as const)('rechaza cambios de %s', campo => {
    const anterior = configuracion(), actual = configuracion();
    actual[campo] += ' cambio';
    expect(comprobarCompatibilidad(anterior, actual).compatible).toBe(false);
  });
  it('rechaza criterios, pesos, fuentes, escalas y dispositivos distintos', () => {
    const anterior = configuracion(), actual = configuracion();
    actual.producto.dispositivo = 'Escritorio';
    actual.metodologia.criterios[0].origen.version = 'Nueva';
    actual.metodologia.criterios[0].peso = 2;
    actual.metodologia.escala.niveles[0].significado = 'Otro';
    actual.metodologia.version = 'Otra';
    expect(comprobarCompatibilidad(anterior, actual)).toMatchObject({ compatible: false });
    expect(comprobarCompatibilidad(anterior, actual).motivos).toHaveLength(4);
  });
  it('no deduce equivalencia a partir de un alcance ausente', () => {
    const anterior = configuracion(), actual = configuracion();
    anterior.pantallas = actual.pantallas = '';
    expect(comprobarCompatibilidad(anterior, actual).compatible).toBe(false);
  });
  it('no deduce equivalencia a partir de fuentes o definiciones ausentes', () => {
    const anterior = configuracion(), actual = configuracion();
    anterior.metodologia.fuente = actual.metodologia.fuente = '';
    expect(comprobarCompatibilidad(anterior, actual).compatible).toBe(false);
    anterior.metodologia.fuente = actual.metodologia.fuente = 'https://fuente.test';
    anterior.metodologia.escala.niveles[0].significado = actual.metodologia.escala.niveles[0].significado = '';
    expect(comprobarCompatibilidad(anterior, actual).compatible).toBe(false);
  });
  it('presenta una agenda sin fusionar hallazgos ni decidir por mayoría', () => {
    const config = configuracion();
    const trabajo = (id: string, valor: string): TrabajoFlujo => ({ evaluadorId: id, nombre: id, respuestas: [respuesta(config.metodologia.criterios[0].id, valor)], hallazgos: [hallazgo(id)], entregadoEn: null, guardadoEn: null });
    const trabajos = [trabajo('e1', 'cumple'), trabajo('e2', 'no_cumple')];
    const agenda = detectarDiscrepancias(config, trabajos);
    expect(agenda.criterios[0]).toMatchObject({ criterioId: config.metodologia.criterios[0].id, motivos: ['Valoraciones distintas.'] });
    expect(agenda.hallazgos.map(h => h.hallazgoId)).toEqual(['e1', 'e2']);
    expect(trabajos[0].respuestas[0].valor).toBe('cumple');
    trabajos[1].respuestas[0] = respuesta(config.metodologia.criterios[0].id, null, true);
    expect(detectarDiscrepancias(config, trabajos).criterios[0].motivos).toContain('Aplicabilidad distinta.');
  });
});
