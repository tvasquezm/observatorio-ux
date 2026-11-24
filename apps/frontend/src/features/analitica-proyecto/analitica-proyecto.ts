// Analítica del proyecto que ayuda a decidir: prioridad de los problemas, calidad de la
// evaluación heurística y lo que falta por hacer. Funciones puras sobre los datos ya cargados.
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { evaluacionesVigentes } from '../heuristica-flujo/analitica';


const nombreEvaluacion = (e: EvaluacionFlujo) => e.configuracion.nombre || e.configuracion.producto.nombre;
/** Problemas acordados que sí son problemas (severidad 0 = "no es un problema"). */
const aceptados = (e: EvaluacionFlujo) => (e.informe?.consenso.hallazgos ?? []).filter(h => h.decision === 'ACEPTADO' && h.severidad > 0);

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

// --- Lo importante de cada técnica ---

export interface ResumenTecnica {
  id: 'personas' | 'journey-map' | 'momentos-criticos' | 'card-sorting' | 'evaluacion-heuristica';
  titulo: string;
  cifras: Array<{ valor: number; etiqueta: string }>;
  /** Lo que conviene mirar primero; null si no hay nada que destacar. */
  destacado: { titulo: string; items: string[] } | null;
  vacio: string | null;
}

type ConContenido<T> = { contenido: T };
export interface DatosTecnicas {
  personas: Array<ConContenido<{ frustraciones?: string[]; necesidades?: string[] }>>;
  journeys: Array<ConContenido<{ perfilUsuario?: { nombre?: string }; fases?: Array<{ nombre: string; emocion: string; oportunidades?: string[] }> }>>;
  momentos: Array<ConContenido<{ perfilUsuario?: { nombre?: string }; incidentes?: Array<{ nombre: string; tipo: string; impacto: string; frecuencia: string }> }>>;
  estudios: Array<{ nombre: string; respuestasCount?: number; cerrado?: boolean; cardsDefinidas?: unknown[] }>;
  evaluaciones: EvaluacionFlujo[];
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const PESO: Record<string, number> = { Alto: 3, Alta: 3, Medio: 2, Media: 2, Bajo: 1, Baja: 1 };

/** Textos más repetidos (sin distinguir mayúsculas); a igual cantidad, en el orden en que aparecen. */
export function masRepetidos(textos: string[], maximo = 3): string[] {
  const conteo = new Map<string, { texto: string; n: number }>();
  for (const t of textos) {
    const texto = t.trim();
    if (!texto) continue;
    const clave = texto.toLocaleLowerCase('es');
    const actual = conteo.get(clave);
    if (actual) actual.n += 1; else conteo.set(clave, { texto, n: 1 });
  }
  return [...conteo.values()].sort((a, b) => b.n - a.n).slice(0, maximo).map(x => x.n > 1 ? `${x.texto} (${x.n})` : x.texto);
}

/** Cifras y lo más importante de cada una de las cinco técnicas del proyecto. */
export function resumenTecnicas(d: DatosTecnicas): ResumenTecnica[] {
  const frustraciones = d.personas.flatMap(p => p.contenido.frustraciones ?? []);
  const necesidades = d.personas.flatMap(p => p.contenido.necesidades ?? []);

  const fases = d.journeys.flatMap(j => (j.contenido.fases ?? []).map(f => ({ ...f, perfil: j.contenido.perfilUsuario?.nombre ?? '' })));
  const negativas = fases.filter(f => f.emocion === 'Negativa');
  const oportunidades = fases.flatMap(f => f.oportunidades ?? []);

  const incidentes = d.momentos.flatMap(m => (m.contenido.incidentes ?? []).map(i => ({ ...i, perfil: m.contenido.perfilUsuario?.nombre ?? '' })));
  const prio = (i: { impacto: string; frecuencia: string }) => (PESO[i.impacto] ?? 0) * (PESO[i.frecuencia] ?? 0);
  const negativos = incidentes.filter(i => i.tipo === 'Negativo').sort((a, b) => prio(b) - prio(a));
  const altos = negativos.filter(i => prio(i) >= 6);

  const respuestas = d.estudios.reduce((t, s) => t + (s.respuestasCount ?? 0), 0);
  const tarjetas = d.estudios.reduce((t, s) => t + (s.cardsDefinidas?.length ?? 0), 0);

  const vigentes = evaluacionesVigentes(d.evaluaciones);
  const problemas = vigentes.flatMap(aceptados);
  const graves = problemas.filter(h => h.severidad >= 3).length;
  const principios = principiosIncumplidos(d.evaluaciones, 3);

  const conPerfil = (texto: string, perfil: string) => perfil ? `${texto} · ${perfil}` : texto;
  return [
    {
      id: 'personas', titulo: 'Personas',
      cifras: [{ valor: d.personas.length, etiqueta: 'personas' }, { valor: frustraciones.length, etiqueta: 'frustraciones' }, { valor: necesidades.length, etiqueta: 'necesidades' }],
      destacado: frustraciones.length ? { titulo: 'Frustraciones principales', items: masRepetidos(frustraciones) } : necesidades.length ? { titulo: 'Necesidades principales', items: masRepetidos(necesidades) } : null,
      vacio: d.personas.length ? null : 'Aún no hay personas.',
    },
    {
      id: 'journey-map', titulo: 'Journey Map',
      cifras: [{ valor: d.journeys.length, etiqueta: 'journeys' }, { valor: fases.length, etiqueta: 'fases' }, { valor: negativas.length, etiqueta: 'fases negativas' }],
      destacado: negativas.length ? { titulo: 'Dónde se traba la experiencia', items: negativas.slice(0, 3).map(f => conPerfil(f.nombre, f.perfil)) } : oportunidades.length ? { titulo: 'Oportunidades', items: masRepetidos(oportunidades) } : null,
      vacio: d.journeys.length ? null : 'Aún no hay journey maps.',
    },
    {
      id: 'momentos-criticos', titulo: 'Momentos críticos',
      cifras: [{ valor: incidentes.length, etiqueta: 'incidentes' }, { valor: altos.length, etiqueta: 'de prioridad alta' }, { valor: incidentes.length - negativos.length, etiqueta: 'positivos' }],
      destacado: negativos.length ? { titulo: 'Incidentes negativos más prioritarios', items: negativos.slice(0, 3).map(i => conPerfil(`${i.nombre} (impacto ${i.impacto.toLowerCase()}, frecuencia ${i.frecuencia.toLowerCase()})`, i.perfil)) } : null,
      vacio: d.momentos.length ? null : 'Aún no hay momentos críticos.',
    },
    {
      id: 'card-sorting', titulo: 'Card Sorting',
      cifras: [{ valor: d.estudios.length, etiqueta: 'estudios' }, { valor: respuestas, etiqueta: 'respuestas' }, { valor: tarjetas, etiqueta: 'tarjetas' }],
      destacado: d.estudios.length ? { titulo: 'Estado de cada estudio', items: d.estudios.slice(0, 3).map(s => {
        const n = s.respuestasCount ?? 0;
        return `${s.nombre}: ${plural(n, 'respuesta', 'respuestas')} · ${s.cerrado ? 'cerrado' : 'abierto'}${n < MUESTRA_MINIMA_CARD_SORTING ? ` · faltan ${MUESTRA_MINIMA_CARD_SORTING - n} para la muestra mínima` : ''}`;
      }) } : null,
      vacio: d.estudios.length ? null : 'Aún no hay estudios de card sorting.',
    },
    {
      id: 'evaluacion-heuristica', titulo: 'Evaluación heurística',
      cifras: [{ valor: vigentes.length, etiqueta: 'evaluaciones' }, { valor: problemas.length, etiqueta: 'problemas acordados' }, { valor: graves, etiqueta: 'graves (3 y 4)' }],
      destacado: principios.length ? { titulo: 'Principios con más problemas', items: principios.map(p => `${p.nombre} (${p.problemas})`) } : null,
      vacio: vigentes.length ? null : 'Aún no hay evaluaciones heurísticas.',
    },
  ];
}
