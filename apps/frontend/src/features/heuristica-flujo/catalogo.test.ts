import { describe, expect, it } from 'vitest';
import {
  ESCALA_OPERATIVA_HEURISTICA, METODOLOGIAS_HEURISTICAS, copiarMetodologia, combinarMetodologias, resumirEvaluacion,
  comprobarCompatibilidad, detectarDiscrepancias, escalaDe,
  claveEscalaPredefinida, escalaPredefinida, metodologiaVacia, parsearListaCriterios, problemasMetodologia,
  clasificarCriterios, resumirCumplimiento,
} from '@observatorio-ux/shared-types';
import { avancePorCategoria, criterioRespondido, esChecklist, pendientesTrabajo } from './flujo-utils';
import type { ConfiguracionFlujo, ConsensoFlujo, DecisionCriterio, DecisionHallazgo, TrabajoFlujo } from '@observatorio-ux/shared-types';

function configuracion(): ConfiguracionFlujo {
  return {
    nombre: 'Compra', producto: { clave: 'tienda', nombre: 'Tienda', version: '1', url: 'https://tienda.test', dispositivo: 'Móvil' },
    objetivo: 'Comprar', tareas: 'Añadir y pagar', pantallas: 'Carro y pago', exclusiones: '',
    metodologia: copiarMetodologia(METODOLOGIAS_HEURISTICAS[0]), evaluadorIds: ['e1', 'e2'], lectorIds: [],
  };
}
/** Deja la escala como la de una evaluación guardada antes de B1: sin niveles favorables. */
const sinFavorables = (c: ConfiguracionFlujo): ConfiguracionFlujo => { c.metodologia.escala.niveles.forEach(n => { delete n.favorable; }); return c; };
const vacio = (): ConsensoFlujo => ({ criterios: [], hallazgos: [], aprobadoPor: [] });
const respuesta = (criterioId: string, valor: string | null = 'cumple', noAplica = false): DecisionCriterio => ({ criterioId, valor, noAplica, motivo: noAplica ? 'Fuera del recorrido' : '', notas: '', justificacion: 'Revisión conjunta' });
const hallazgo = (id: string, decision: DecisionHallazgo['decision'] = 'ACEPTADO'): DecisionHallazgo => ({
  id, decision, criterioIds: ['nielsen10:1'], titulo: 'Estado ausente', pantalla: 'Pago', descripcion: 'Sin respuesta',
  recomendacion: 'Mostrar estado', severidad: 3, prioridad: 'ALTA', notas: '', evidenciaIds: [], origenIds: ['original'], justificacion: 'Acordado',
});

describe('catálogo y snapshots', () => {
  it('conserva las doce familias y fuentes versionadas protegidas', () => {
    expect(METODOLOGIAS_HEURISTICAS.map(m => [m.id, m.criterios.length])).toEqual([
      ['nielsen10', 10], ['shneiderman8', 8], ['tognazzini', 19], ['bastien-scapin', 18], ['gerhardt-powals', 10],
      ['hassan-montero-martin-fernandez', 11], ['hassan-checklist-2003', 71], ['bertini2006', 8], ['wcag22', 12], ['coga2021', 8], ['amershi2019', 18], ['rubrica-utem-eval-heuristica', 22],
    ]);
    const ids = METODOLOGIAS_HEURISTICAS.flatMap(m => m.criterios.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of METODOLOGIAS_HEURISTICAS) {
      expect(m.protegida && Object.isFrozen(m.criterios[0].origen)).toBe(true);
      expect(m.fuente).toMatch(/^https:\/\//);
      expect(m.escala.fuente).toBe(m.id === 'hassan-checklist-2003' ? 'Escala Sí/No de la plataforma' : m.id === 'rubrica-utem-eval-heuristica' ? 'Rúbrica UTEM, Evaluación heurística (nota de 1 a 5)' : 'Escala operativa de la plataforma');
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
    expect(mezcla.criterios.filter(c => c.escala?.tipo === 'ordinal')).toHaveLength(10);
    expect(mezcla.criterios.filter(c => !c.escala)).toHaveLength(20);
    mezcla.criterios[0].origen.version = 'Cambio local';
    expect(METODOLOGIAS_HEURISTICAS[0].criterios[0].origen.version).not.toBe('Cambio local');
    expect(() => combinarMetodologias([])).toThrow();
  });
});

describe('escala por criterio', () => {
  const rango = { tipo: 'numerica' as const, sentido: 'mayor_mejor' as const, fuente: 'Rúbrica local', niveles: [{ id: 'n1', etiqueta: '1', significado: 'Bajo', valor: 1 }, { id: 'n5', etiqueta: '5', significado: 'Alto', valor: 5 }] };
  it('usa la escala propia y cuenta aparte sin tocar el índice', () => {
    const config = configuracion(), consenso = vacio();
    config.metodologia.criterios[0].escala = rango;
    expect(escalaDe(config.metodologia, config.metodologia.criterios[0])).toBe(rango);
    expect(escalaDe(config.metodologia, config.metodologia.criterios[1])).toBe(config.metodologia.escala);
    consenso.criterios = [respuesta(config.metodologia.criterios[0].id, 'n5'), respuesta(config.metodologia.criterios[1].id, 'cumple'), respuesta(config.metodologia.criterios[2].id, 'cumple')];
    const r = resumirEvaluacion(config, consenso);
    expect(r).toMatchObject({ evaluados: 3, pendientes: 7 });
    expect(r.porCategoria.find(n => n.id === 'cumple')!.count).toBe(2);
    expect(r.porEscala).toEqual([{ fuente: 'Rúbrica local', tipo: 'numerica', criterios: 1, evaluados: 1, distribucion: [{ id: 'n1', etiqueta: '1', count: 0 }, { id: 'n5', etiqueta: '5', count: 1 }] }]);
  });
  it('rechaza como pendiente un valor de otra escala', () => {
    const config = configuracion(), consenso = vacio();
    config.metodologia.criterios[0].escala = rango;
    consenso.criterios = [respuesta(config.metodologia.criterios[0].id, 'cumple')];
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ evaluados: 0, pendientes: 10 });
  });
  it('sin escalas propias el resultado conserva su forma anterior', () => {
    expect(resumirEvaluacion(configuracion(), vacio()).porEscala).toEqual([]);
  });
  it('los pendientes del evaluador usan la escala efectiva del criterio', () => {
    const config = configuracion();
    config.metodologia.criterios[0].escala = rango;
    const respuestas = config.metodologia.criterios.map(c => respuesta(c.id, c.id === config.metodologia.criterios[0].id ? 'n5' : 'cumple'));
    expect(pendientesTrabajo(config, respuestas, [])).toEqual([]);
    respuestas[0] = respuesta(config.metodologia.criterios[0].id, 'cumple');
    expect(pendientesTrabajo(config, respuestas, [])).toHaveLength(1);
  });
  it('compara las escalas propias y exige que estén completas', () => {
    const anterior = configuracion(), actual = configuracion();
    anterior.metodologia.criterios[0].escala = rango;
    actual.metodologia.criterios[0].escala = structuredClone(rango);
    expect(comprobarCompatibilidad(anterior, actual)).toEqual({ compatible: true, motivos: [] });
    actual.metodologia.criterios[0].escala!.niveles[0].significado = 'Otro';
    expect(comprobarCompatibilidad(anterior, actual).motivos).toEqual(['Las escalas o sus reglas de cálculo no son equivalentes.']);
    anterior.metodologia.criterios[0].escala!.niveles[0].significado = actual.metodologia.criterios[0].escala!.niveles[0].significado = '';
    expect(comprobarCompatibilidad(anterior, actual).compatible).toBe(false);
  });
});

describe('resumen del consenso', () => {
  it('distingue pendiente, no aplica e inválido', () => {
    const config = configuracion(), consenso = vacio();
    consenso.criterios = [respuesta(config.metodologia.criterios[0].id), respuesta(config.metodologia.criterios[1].id, null, true), respuesta(config.metodologia.criterios[2].id, 'desconocido')];
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ evaluados: 1, pendientes: 8, noAplica: 1, indice: null, denominador: 0, formula: null });
    consenso.criterios[1].motivo = '';
    expect(resumirEvaluacion(config, consenso)).toMatchObject({ pendientes: 8, noAplica: 1 });
  });
  it('no produce un cero cuando todo es no aplica', () => {
    const config = configuracion(), consenso = vacio();
    consenso.criterios = config.metodologia.criterios.map(c => ({ ...respuesta(c.id, null, true), motivo: '' }));
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

describe('constructor de métodos', () => {
  const origen = { metodologiaId: 'propia', autor: 'Ana', fuente: 'Definición propia de Ana', version: '1', tipo: 'personalizado' };
  const ids = () => { let n = 0; return () => `c${++n}`; };

  it('ofrece escalas predefinidas válidas y como copias independientes', () => {
    const si = escalaPredefinida('si_no'), likert = escalaPredefinida('likert_1_5'), nielsen = escalaPredefinida('nielsen_0_4');
    expect(si.niveles.map(n => n.id)).toEqual(['si', 'no']);
    expect(likert.niveles.map(n => n.valor)).toEqual([1, 2, 3, 4, 5]);
    expect(likert).toMatchObject({ tipo: 'numerica', sentido: 'mayor_mejor', formula: 'media_ponderada' });
    expect(nielsen.niveles.map(n => n.valor)).toEqual([0, 1, 2, 3, 4]);
    expect(nielsen.sentido).toBe('menor_mejor');
    si.niveles[0].etiqueta = 'Cambiado';
    expect(escalaPredefinida('si_no').niveles[0].etiqueta).toBe('Sí');
    for (const e of [si, likert, nielsen]) expect(problemasMetodologia({ ...metodologiaVacia('Ana', 'm'), criterios: [], escala: e }).filter(p => p.includes('escala'))).toEqual([]);
  });
  it('reconoce una escala predefinida y distingue una editada', () => {
    expect(claveEscalaPredefinida(escalaPredefinida('likert_1_5'))).toBe('likert_1_5');
    const editada = escalaPredefinida('si_no'); editada.niveles[0].etiqueta = 'Correcto';
    expect(claveEscalaPredefinida(editada)).toBeNull();
    expect(claveEscalaPredefinida(METODOLOGIAS_HEURISTICAS[0].escala)).toBeNull();
  });
  it('una línea es un criterio, con categoría opcional y sin viñetas', () => {
    const { criterios, avisos } = parsearListaCriterios('Navegación: Menús claros\n\n- Botones visibles\n2) Ayuda: contextual: en cada paso\r\n', origen, ids());
    expect(avisos).toEqual([]);
    expect(criterios.map(c => [c.id, c.categoria, c.nombre, c.peso])).toEqual([
      ['c1', 'Navegación', 'Menús claros', 1], ['c2', 'Personalizado', 'Botones visibles', 1], ['c3', 'Ayuda', 'contextual: en cada paso', 1],
    ]);
    expect(criterios[0].origen).toEqual(origen);
    expect(criterios[0].escala).toBeUndefined();
  });
  it('avisa y omite duplicados, líneas largas y respeta los criterios existentes', () => {
    const { criterios, avisos } = parsearListaCriterios(`A: uno\na: UNO\nExistente\n${'x'.repeat(301)}`, origen, ids(), [{ nombre: 'Existente', categoria: 'Personalizado' }]);
    expect(criterios.map(c => c.nombre)).toEqual(['uno']);
    expect(avisos).toHaveLength(3);
    expect(avisos.join(' ')).toMatch(/repite/);
    expect(avisos.join(' ')).toMatch(/demasiado larga/);
  });
  it('no pasa del máximo de criterios', () => {
    const { criterios, avisos } = parsearListaCriterios(Array.from({ length: 502 }, (_, i) => `ítem ${i}`).join('\n'), origen, ids());
    expect(criterios).toHaveLength(500);
    expect(avisos[0]).toMatch(/máximo de 500/);
  });
  it('explica en lenguaje simple lo que falta para guardar', () => {
    const vacia = metodologiaVacia('Ana', 'm');
    expect(problemasMetodologia(vacia)).toEqual(['Agrega al menos un criterio.']);
    const { criterios } = parsearListaCriterios('Uno', origen, ids());
    expect(problemasMetodologia({ ...vacia, criterios })).toEqual([]);
    const mala = { ...vacia, nombre: ' ', criterios: [{ ...criterios[0], nombre: '', peso: 0 }], escala: { ...escalaPredefinida('likert_1_5'), niveles: [{ id: 'a', etiqueta: '', significado: 'x' }] } };
    expect(problemasMetodologia(mala)).toEqual([
      'Ponle un nombre a la metodología.', 'El criterio 1 no tiene nombre.', 'El peso del criterio 1 debe ser mayor que cero.',
      'El nivel 1 de la escala necesita etiqueta y significado.', 'El nivel 1 de la escala necesita un valor numérico.',
    ]);
  });
  it('un criterio con escala predefinida propia valida su valor y deja intacta una evaluación antigua', () => {
    const c = configuracion();
    const [primero, ...resto] = c.metodologia.criterios;
    c.metodologia.criterios = [{ ...primero, escala: escalaPredefinida('si_no') }, ...resto];
    expect(pendientesTrabajo(c, [{ criterioId: primero.id, valor: 'si', noAplica: false, motivo: '', notas: '' }], []).some(p => p.includes(primero.nombre))).toBe(false);
    expect(pendientesTrabajo(c, [{ criterioId: primero.id, valor: 'cumple', noAplica: false, motivo: '', notas: '' }], []).some(p => p.includes(primero.nombre))).toBe(true);
    expect(escalaDe(c.metodologia, resto[0])).toBe(c.metodologia.escala);
  });
});

describe('checklist Hassan y Martín (D22)', () => {
  const checklist = () => METODOLOGIAS_HEURISTICAS.find(m => m.id === 'hassan-checklist-2003')!;
  const configChecklist = (): ConfiguracionFlujo => ({ ...configuracion(), metodologia: copiarMetodologia(checklist()) });
  it('tiene 11 categorías, escala Sí/No y deja intacta la síntesis previa', () => {
    const m = checklist();
    expect(new Set(m.criterios.map(c => c.categoria)).size).toBe(11);
    expect(m.criterios.every(c => c.nombre.trim() && c.peso === 1 && !c.escala)).toBe(true);
    expect(m.escala.niveles.map(n => n.id)).toEqual(['si', 'no']);
    expect(claveEscalaPredefinida(m.escala)).toBe('si_no');
    expect(problemasMetodologia(m)).toEqual([]);
    expect(METODOLOGIAS_HEURISTICAS.find(x => x.id === 'hassan-montero-martin-fernandez')!.criterios).toHaveLength(11);
  });
  it('esChecklist solo con todos los criterios de dos niveles', () => {
    const c = configChecklist();
    expect(esChecklist(c)).toBe(true);
    expect(esChecklist(configuracion())).toBe(false);
    c.metodologia.criterios[0] = { ...c.metodologia.criterios[0], escala: escalaPredefinida('likert_1_5') };
    expect(esChecklist(c)).toBe(false);
    c.metodologia.criterios = [];
    expect(esChecklist(c)).toBe(false);
  });
  it('cuenta respondidos por categoría; no aplica cuenta sin motivo', () => {
    const c = configChecklist();
    const [a, b] = c.metodologia.criterios.filter(x => x.categoria === 'Generales');
    const base = (criterioId: string) => ({ criterioId, valor: null, noAplica: false, motivo: '', notas: '' });
    const resp = [{ ...base(a.id), valor: 'si' }, { ...base(b.id), noAplica: true }];
    const generales = () => avancePorCategoria(c, resp).find(g => g.categoria === 'Generales')!;
    expect(generales()).toMatchObject({ respondidos: 2 });
    expect(generales().criterios).toHaveLength(7);
    resp[1].motivo = 'Fuera del alcance';
    expect(generales().respondidos).toBe(2);
    expect(criterioRespondido(c, a, { ...base(a.id), valor: 'cumple' })).toBe(false);
    expect(avancePorCategoria(c, []).map(g => g.categoria)[0]).toBe('Generales');
  });
});

describe('clasificación y cumplimiento (B1)', () => {
  const checklist = () => copiarMetodologia(METODOLOGIAS_HEURISTICAS.find(m => m.id === 'hassan-checklist-2003')!);
  const configChecklist = (): ConfiguracionFlujo => ({ ...configuracion(), metodologia: checklist() });
  const consensoDe = (...criterios: DecisionCriterio[]): ConsensoFlujo => ({ ...vacio(), criterios });
  it('la escala operativa marca Cumple favorable y No cumple desfavorable; Parcial queda neutra', () => {
    expect(ESCALA_OPERATIVA_HEURISTICA.niveles.map(n => n.favorable)).toEqual([true, undefined, false]);
    const r = resumirCumplimiento(configuracion(), consensoDe(respuesta('nielsen10:1', 'cumple'), respuesta('nielsen10:2', 'parcial'), respuesta('nielsen10:3', 'no_cumple')))!;
    expect(r.total).toMatchObject({ favorables: 1, desfavorables: 1, neutros: 1, sinEvaluar: 7, proporcion: 0.5 });
  });
  it('una escala operativa guardada antes sin favorable sigue reconociéndose', () => {
    const antigua = JSON.parse(JSON.stringify(ESCALA_OPERATIVA_HEURISTICA));
    antigua.niveles.forEach((n: { favorable?: boolean }) => { delete n.favorable; });
    expect(claveEscalaPredefinida(antigua)).toBe(claveEscalaPredefinida(ESCALA_OPERATIVA_HEURISTICA));
  });
  it('la escala Sí/No marca Sí favorable y No desfavorable; los guardados antes siguen reconociéndose', () => {
    expect(escalaPredefinida('si_no').niveles.map(n => n.favorable)).toEqual([true, false]);
    const antigua = escalaPredefinida('si_no');
    antigua.niveles.forEach(n => { delete n.favorable; });
    expect(claveEscalaPredefinida(antigua)).toBe('si_no');
    expect(escalaPredefinida('likert_1_5').niveles.every(n => n.favorable === undefined)).toBe(true);
  });
  it('clasifica favorable, desfavorable, no aplica y sin evaluar según la escala efectiva', () => {
    const c = configChecklist(); const [a, b, n, sinMotivo, desconocido, ambiguo] = c.metodologia.criterios.map(x => x.id);
    const consenso = consensoDe(
      respuesta(a, 'si'), respuesta(b, 'no'), respuesta(n, null, true), { ...respuesta(sinMotivo, null, true), motivo: '' },
      respuesta(desconocido, 'cumple'), respuesta(ambiguo, 'si'), respuesta(ambiguo, 'no'),
    );
    const clases = clasificarCriterios(c, consenso).map(x => x.clase);
    expect(clases.slice(0, 6)).toEqual(['favorable', 'desfavorable', 'no_aplica', 'no_aplica', 'sin_evaluar', 'sin_evaluar']);
    expect(clases.slice(6).every(x => x === 'sin_evaluar')).toBe(true);
    expect(clasificarCriterios(c, consenso)[0]).toMatchObject({ criterioId: a, categoria: 'Generales' });
  });
  it('calcula la proporción por categoría y total; sin respuestas favorables o desfavorables es null', () => {
    const c = configChecklist(); const ids = c.metodologia.criterios.filter(x => x.categoria === 'Generales').map(x => x.id);
    const r = resumirCumplimiento(c, consensoDe(respuesta(ids[0], 'si'), respuesta(ids[1], 'no'), respuesta(ids[2], 'si'), respuesta(ids[3], null, true)))!;
    expect(r.porCategoria[0]).toMatchObject({ categoria: 'Generales', favorables: 2, desfavorables: 1, noAplica: 1, sinEvaluar: 3 });
    expect(r.porCategoria[0].proporcion).toBeCloseTo(2 / 3);
    expect(r.total).toMatchObject({ favorables: 2, desfavorables: 1, noAplica: 1, sinEvaluar: 67 });
    expect(r.porCategoria).toHaveLength(11);
    expect(r.porCategoria[1].proporcion).toBeNull();
    const todoNoAplica = resumirCumplimiento(c, consensoDe(...c.metodologia.criterios.map(x => respuesta(x.id, null, true))))!;
    expect(todoNoAplica.total).toMatchObject({ favorables: 0, desfavorables: 0, noAplica: 71, proporcion: null });
  });
  it('evaluación antigua o escala sin niveles favorables no produce cumplimiento', () => {
    expect(resumirCumplimiento(sinFavorables(configuracion()), consensoDe(respuesta('nielsen10:1')))).toBeNull();
    expect(clasificarCriterios(sinFavorables(configuracion()), consensoDe(respuesta('nielsen10:1')))[0].clase).toBe('neutro');
    const c = configuracion(); c.metodologia.escala = escalaPredefinida('likert_1_5');
    expect(resumirCumplimiento(c, vacio())).toBeNull();
  });
  it('con escalas mixtas solo cuentan los criterios cuya escala efectiva define favorables', () => {
    const c = sinFavorables(configuracion());
    c.metodologia.criterios[0] = { ...c.metodologia.criterios[0], escala: escalaPredefinida('si_no') };
    const r = resumirCumplimiento(c, consensoDe(respuesta('nielsen10:1', 'si'), respuesta('nielsen10:2', 'cumple')))!;
    expect(r.total).toMatchObject({ favorables: 1, desfavorables: 0, neutros: 1, sinEvaluar: 8, proporcion: 1 });
  });
  it('no altera resumirEvaluacion', () => {
    const c = configChecklist();
    expect(Object.keys(resumirEvaluacion(c, vacio())).sort()).toEqual(['denominador', 'evaluados', 'formula', 'indice', 'noAplica', 'pendientes', 'porCategoria', 'porEscala', 'porSeveridad', 'totalHallazgos']);
  });
});

describe('rúbrica UTEM', () => {
  const rubrica = () => METODOLOGIAS_HEURISTICAS.find(m => m.id === 'rubrica-utem-eval-heuristica')!;
  it('tiene 22 criterios en seis conceptos y escala numérica 1 a 5 con las etiquetas del documento', () => {
    const m = rubrica();
    expect(m.protegida).toBe(true);
    expect(m.criterios).toHaveLength(22);
    expect([...new Set(m.criterios.map(c => c.categoria))]).toEqual(['Identidad', 'Contenido', 'Diseño', 'Navegación', 'Accesibilidad', 'Utilidad']);
    expect(m.escala.tipo).toBe('numerica');
    expect(m.escala.sentido).toBe('mayor_mejor');
    expect(m.escala.niveles.map(n => [n.valor, n.etiqueta])).toEqual([[1, '1 · Muy malo o no funciona'], [2, '2 · Funciona pobremente'], [3, '3 · Funciona medianamente'], [4, '4 · Cumple'], [5, '5 · Es lo que el usuario busca']]);
    expect(problemasMetodologia(m)).toEqual([]);
  });
  it('no marca niveles favorables: no genera "n de N cumplen" y el índice sí es calculable', () => {
    const m = copiarMetodologia(rubrica());
    expect(m.escala.niveles.some(n => n.favorable !== undefined)).toBe(false);
    expect(esChecklist({ ...configuracion(), metodologia: m })).toBe(false);
  });
  it('no cambia la síntesis ni la lista previa del catálogo', () => {
    expect(METODOLOGIAS_HEURISTICAS[0].id).toBe('nielsen10');
    expect(METODOLOGIAS_HEURISTICAS.find(x => x.id === 'hassan-checklist-2003')!.criterios).toHaveLength(71);
  });
});

