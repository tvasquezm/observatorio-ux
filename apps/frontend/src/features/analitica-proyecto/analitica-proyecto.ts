// Analítica del proyecto que ayuda a decidir: prioridad de los problemas, calidad de la
// evaluación heurística y lo que falta por hacer. Funciones puras sobre los datos ya cargados.
import type { EvaluacionFlujo, HallazgoFlujo } from '@observatorio-ux/shared-types';
import { evaluacionesVigentes } from '../heuristica-flujo/analitica';

export const PRIORIDADES = ['URGENTE', 'ALTA', 'MEDIA', 'BAJA'] as const;
export const SEVERIDADES = [4, 3, 2, 1] as const;
export type Zona = 'ya' | 'planificar' | 'vigilar';

/** Arreglar ya: grave y urgente. Planificar: grave o urgente. Vigilar: el resto. */
export function zona(severidad: number, prioridad: HallazgoFlujo['prioridad']): Zona {
  const urgente = prioridad === 'URGENTE' || prioridad === 'ALTA';
  if (severidad >= 3 && urgente) return 'ya';
  if (severidad >= 3 || urgente) return 'planificar';
  return 'vigilar';
}

export interface ProblemaPriorizado { id: string; titulo: string; evaluacion: string; severidad: number; prioridad: HallazgoFlujo['prioridad']; zona: Zona }

const nombreEvaluacion = (e: EvaluacionFlujo) => e.configuracion.nombre || e.configuracion.producto.nombre;
/** Problemas acordados que sí son problemas (severidad 0 = "no es un problema"). */
const aceptados = (e: EvaluacionFlujo) => (e.informe?.consenso.hallazgos ?? []).filter(h => h.decision === 'ACEPTADO' && h.severidad > 0);

/** Problemas acordados (severidad 1 a 4) ubicados en la matriz severidad × prioridad. */
export function matrizPrioridad(evaluaciones: EvaluacionFlujo[]) {
  const problemas: ProblemaPriorizado[] = evaluacionesVigentes(evaluaciones).flatMap(e => aceptados(e)
    .map(h => ({ id: h.id, titulo: h.titulo, evaluacion: nombreEvaluacion(e), severidad: h.severidad, prioridad: h.prioridad, zona: zona(h.severidad, h.prioridad) })));
  const celda = (severidad: number, prioridad: string) => problemas.filter(p => p.severidad === severidad && p.prioridad === prioridad);
  const orden = (p: ProblemaPriorizado) => p.severidad * 10 + (3 - PRIORIDADES.indexOf(p.prioridad));
  return {
    total: problemas.length,
    filas: SEVERIDADES.map(severidad => ({ severidad, celdas: PRIORIDADES.map(prioridad => ({ prioridad, problemas: celda(severidad, prioridad), zona: zona(severidad, prioridad) })) })),
    porZona: { ya: problemas.filter(p => p.zona === 'ya').length, planificar: problemas.filter(p => p.zona === 'planificar').length, vigilar: problemas.filter(p => p.zona === 'vigilar').length },
    arreglarYa: problemas.filter(p => p.zona === 'ya').sort((a, b) => orden(b) - orden(a)),
  };
}

/** Principios con más problemas acordados, con el nombre de la metodología usada. */
export function principiosIncumplidos(evaluaciones: EvaluacionFlujo[], maximo = 5) {
  const conteo = new Map<string, { nombre: string; categoria: string; problemas: number }>();
  for (const e of evaluacionesVigentes(evaluaciones)) {
    const criterios = (e.informe?.configuracion ?? e.configuracion).metodologia.criterios;
    for (const h of aceptados(e)) for (const id of h.criterioIds) {
      const criterio = criterios.find(c => c.id === id);
      const actual = conteo.get(id) ?? { nombre: criterio?.nombre ?? id, categoria: criterio?.categoria ?? '', problemas: 0 };
      actual.problemas += 1;
      conteo.set(id, actual);
    }
  }
  return [...conteo.values()].sort((a, b) => b.problemas - a.problemas || a.nombre.localeCompare(b.nombre)).slice(0, maximo);
}

/**
 * Coincidencia del equipo en cada evaluación: de los criterios que respondieron dos o más
 * evaluadores (sin "no aplica"), qué porcentaje tuvo la misma respuesta de todos.
 */
export function coincidenciaEquipo(evaluaciones: EvaluacionFlujo[]) {
  return evaluacionesVigentes(evaluaciones).flatMap(e => {
    const porCriterio = new Map<string, string[]>();
    for (const t of e.trabajos) for (const r of t.respuestas) {
      if (r.noAplica || r.valor == null) continue;
      porCriterio.set(r.criterioId, [...(porCriterio.get(r.criterioId) ?? []), r.valor]);
    }
    const comparables = [...porCriterio.values()].filter(v => v.length >= 2);
    if (!comparables.length) return [];
    const iguales = comparables.filter(v => v.every(x => x === v[0])).length;
    return [{ evaluacion: nombreEvaluacion(e), evaluadores: e.trabajos.length, comparables: comparables.length, coincidencia: Math.round((iguales / comparables.length) * 100) }];
  });
}

export interface Pendiente { tipo: 'falta' | 'aviso'; texto: string; ruta: string }
export const MUESTRA_MINIMA_CARD_SORTING = 15;
const FASE: Record<EvaluacionFlujo['fase'], string> = {
  BORRADOR: 'en borrador', EN_EVALUACION: 'en evaluación individual', PENDIENTE_CONSENSO: 'esperando el acuerdo del equipo', CONSOLIDADA: 'consolidada, sin finalizar', FINALIZADA: 'finalizada',
};

/** Lista concreta de lo que falta, en el orden en que conviene resolverlo. */
export function pendientesProyecto(datos: {
  personas: number; journeys: number; momentos: number;
  estudios: Array<{ nombre: string; respuestasCount?: number; cerrado?: boolean }>;
  evaluaciones: EvaluacionFlujo[];
}): Pendiente[] {
  const lista: Pendiente[] = [];
  if (!datos.personas) lista.push({ tipo: 'falta', texto: 'Aún no hay personas: son la base de los journey maps y del informe.', ruta: 'personas' });
  if (!datos.journeys) lista.push({ tipo: 'falta', texto: 'Aún no hay journey maps del recorrido de las personas.', ruta: 'journey-map' });
  else if (datos.personas > datos.journeys) lista.push({ tipo: 'aviso', texto: `Hay ${datos.personas} personas y ${datos.journeys} journey map${datos.journeys === 1 ? '' : 's'}: falta el recorrido de alguna.`, ruta: 'journey-map' });
  if (!datos.momentos) lista.push({ tipo: 'falta', texto: 'Aún no hay momentos críticos registrados.', ruta: 'momentos-criticos' });
  if (!datos.estudios.length) lista.push({ tipo: 'falta', texto: 'Aún no hay estudios de card sorting.', ruta: 'card-sorting' });
  for (const s of datos.estudios) {
    const n = s.respuestasCount ?? 0;
    if (n < MUESTRA_MINIMA_CARD_SORTING) lista.push({ tipo: 'aviso', texto: `El card sorting "${s.nombre}" tiene ${n} respuesta${n === 1 ? '' : 's'}; se recomiendan al menos ${MUESTRA_MINIMA_CARD_SORTING}.`, ruta: 'card-sorting' });
  }
  const vigentes = evaluacionesVigentes(datos.evaluaciones);
  if (!vigentes.length) lista.push({ tipo: 'falta', texto: 'Aún no hay evaluaciones heurísticas.', ruta: 'evaluacion-heuristica' });
  for (const e of vigentes) {
    const sinEntregar = (e.avanceEquipo ?? []).filter(a => !a.entregadoEn);
    if (e.fase === 'EN_EVALUACION' && sinEntregar.length) {
      lista.push({ tipo: 'aviso', texto: `En "${nombreEvaluacion(e)}" falta${sinEntregar.length === 1 ? '' : 'n'} ${sinEntregar.length} revisión${sinEntregar.length === 1 ? '' : 'es'} por entregar (${sinEntregar.map(a => a.nombre).join(', ')}).`, ruta: 'evaluacion-heuristica' });
    } else if (e.fase !== 'FINALIZADA') {
      lista.push({ tipo: 'aviso', texto: `La evaluación "${nombreEvaluacion(e)}" está ${FASE[e.fase]}.`, ruta: 'evaluacion-heuristica' });
    }
  }
  return lista.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'falta' ? -1 : 1));
}

/** Revisiones heurísticas que esperan algo de esta persona: su revisión individual o el acuerdo del equipo. */
export function trabajoEnCurso(evaluaciones: EvaluacionFlujo[], usuarioId: string): Pendiente[] {
  return evaluacionesVigentes(evaluaciones).flatMap((e): Pendiente[] => {
    const nombre = nombreEvaluacion(e);
    const participa = e.configuracion.evaluadorIds?.includes(usuarioId) || e.coordinadorId === usuarioId;
    if (!participa) return [];
    const propio = e.trabajos.find(t => t.evaluadorId === usuarioId);
    if (e.fase === 'EN_EVALUACION' && propio && !propio.entregadoEn) return [{ tipo: 'falta', texto: `Termina tu revisión de "${nombre}".`, ruta: 'evaluacion-heuristica' }];
    if (e.fase === 'PENDIENTE_CONSENSO' && !e.consenso.aprobadoPor?.includes(usuarioId)) return [{ tipo: 'aviso', texto: `El equipo espera tu revisión del acuerdo en "${nombre}".`, ruta: 'evaluacion-heuristica' }];
    return [];
  });
}
