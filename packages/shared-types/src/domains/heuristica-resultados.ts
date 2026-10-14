import { escalaDe } from './heuristica-flujo';
import type { ConfiguracionFlujo, ConsensoFlujo, EscalaFlujo, TrabajoFlujo } from './heuristica-flujo';

/** Distribución de los criterios que usan una escala propia (distinta de la de la metodología). */
export interface DistribucionEscalaPropia {
  fuente: string; tipo: EscalaFlujo['tipo']; criterios: number; evaluados: number;
  distribucion: Array<{ id: string; etiqueta: string; count: number }>;
}
export interface ResumenEvaluacionFlujo {
  evaluados: number; pendientes: number; noAplica: number;
  /** Solo criterios que usan la escala de la metodología. Los de escala propia van en `porEscala`. */
  porCategoria: Array<{ id: string; etiqueta: string; count: number }>;
  porEscala: DistribucionEscalaPropia[];
  porSeveridad: number[]; totalHallazgos: number;
  indice: number | null; denominador: number; formula: string | null;
}

export function resumirEvaluacion(configuracion: ConfiguracionFlujo, consenso: ConsensoFlujo): ResumenEvaluacionFlujo {
  const { criterios, escala } = configuracion.metodologia;
  const porCategoria = escala.niveles.map(({ id, etiqueta }) => ({ id, etiqueta, count: 0 }));
  const propias = new Map<string, DistribucionEscalaPropia>();
  const numerica = escala.tipo === 'numerica' && escala.formula === 'media_ponderada'
    && escala.sentido !== 'sin_orden' && escala.niveles.length > 0
    && new Set(escala.niveles.map(n => n.id)).size === escala.niveles.length
    && escala.niveles.every(n => typeof n.valor === 'number' && Number.isFinite(n.valor))
    && criterios.every(c => Number.isFinite(c.peso) && c.peso > 0);
  let evaluados = 0, noAplica = 0, denominador = 0, numerador = 0;
  for (const criterio of criterios) {
    // Criterios con escala propia: se cuentan aparte; nunca se mezclan rangos distintos en el índice.
    let grupo: DistribucionEscalaPropia | null = null;
    if (criterio.escala) {
      const clave = JSON.stringify(criterio.escala);
      grupo = propias.get(clave) ?? null;
      if (!grupo) {
        grupo = { fuente: criterio.escala.fuente, tipo: criterio.escala.tipo, criterios: 0, evaluados: 0, distribucion: criterio.escala.niveles.map(({ id, etiqueta }) => ({ id, etiqueta, count: 0 })) };
        propias.set(clave, grupo);
      }
      grupo.criterios++;
    }
    const respuestas = consenso.criterios.filter(r => r.criterioId === criterio.id);
    // Una decisión ambigua permanece pendiente; nunca escoger una respuesta por orden.
    if (respuestas.length !== 1) continue;
    const respuesta = respuestas[0];
    if (respuesta.noAplica) {
      if (respuesta.valor === null && respuesta.motivo.trim()) noAplica++;
      continue;
    }
    const nivel = escalaDe(configuracion.metodologia, criterio).niveles.find(n => n.id === respuesta.valor);
    if (!nivel) continue;
    evaluados++;
    if (grupo) {
      grupo.evaluados++;
      grupo.distribucion.find(n => n.id === nivel.id)!.count++;
      continue;
    }
    porCategoria.find(n => n.id === nivel.id)!.count++;
    if (numerica) {
      denominador += criterio.peso;
      numerador += criterio.peso * nivel.valor!;
    }
  }
  const hallazgos = [...new Map(consenso.hallazgos.filter(h => h.decision === 'ACEPTADO').map(h => [h.id, h])).values()];
  const porSeveridad = [0, 0, 0, 0, 0];
  hallazgos.forEach(h => { if (Number.isInteger(h.severidad) && h.severidad >= 0 && h.severidad <= 4) porSeveridad[h.severidad]++; });
  const indice = numerica && denominador > 0 && Number.isFinite(numerador) && Number.isFinite(denominador) ? numerador / denominador : null;
  const base = 'Σ(valor × peso) / Σ(peso de criterios evaluados aplicables)';
  return {
    evaluados, pendientes: criterios.length - evaluados - noAplica, noAplica, porCategoria, porEscala: [...propias.values()], porSeveridad,
    totalHallazgos: hallazgos.length, indice, denominador,
    formula: numerica ? (propias.size ? `${base}, solo criterios con la escala de la metodología` : base) : null,
  };
}

export function comprobarCompatibilidad(anterior: ConfiguracionFlujo, actual: ConfiguracionFlujo): { compatible: boolean; motivos: string[] } {
  const motivos: string[] = [];
  if (!anterior.producto.clave.trim() || !actual.producto.clave.trim() || anterior.producto.clave !== actual.producto.clave) motivos.push('El producto no tiene la misma clave identificable.');
  const campos = ['objetivo', 'tareas', 'pantallas', 'exclusiones'] as const;
  for (const campo of campos) {
    if (campo !== 'exclusiones' && (!anterior[campo].trim() || !actual[campo].trim())) motivos.push(`Falta declarar ${campo} en alguna evaluación.`);
    else if (anterior[campo] !== actual[campo]) motivos.push(`Cambió el alcance: ${campo}.`);
  }
  if (!anterior.producto.dispositivo.trim() || !actual.producto.dispositivo.trim() || anterior.producto.dispositivo !== actual.producto.dispositivo) motivos.push('Los dispositivos no son equivalentes o no están declarados.');
  const fuentes = (c: ConfiguracionFlujo) => {
    const m = c.metodologia;
    return JSON.stringify([m.autor, m.fuente, m.version, m.tipo, m.ambito]);
  };
  const fuenteCompleta = (c: ConfiguracionFlujo) => [c.metodologia.autor, c.metodologia.fuente, c.metodologia.version, c.metodologia.tipo, c.metodologia.ambito].every(x => x.trim());
  if (!fuenteCompleta(anterior) || !fuenteCompleta(actual) || fuentes(anterior) !== fuentes(actual)) motivos.push('La fuente, versión o ámbito de la metodología cambió o está incompleta.');
  const definiciones = (c: ConfiguracionFlujo) => JSON.stringify(c.metodologia.criterios.map(x => [x.id, x.nombre, x.descripcion, x.categoria, x.peso, x.origen.metodologiaId, x.origen.autor, x.origen.fuente, x.origen.version, x.origen.tipo]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const completas = (c: ConfiguracionFlujo) => c.metodologia.criterios.length > 0 && c.metodologia.criterios.every(x => x.id && x.nombre && x.descripcion && x.origen.metodologiaId && x.origen.autor && x.origen.fuente && x.origen.version && x.origen.tipo && Number.isFinite(x.peso) && x.peso > 0)
    && new Set(c.metodologia.criterios.map(x => x.id)).size === c.metodologia.criterios.length;
  if (!completas(anterior) || !completas(actual) || definiciones(anterior) !== definiciones(actual)) motivos.push('Los criterios, sus definiciones, versiones de origen o pesos no son equivalentes.');
  const escalas = (c: ConfiguracionFlujo) => {
    const e = c.metodologia.escala;
    const propias = c.metodologia.criterios.filter(x => x.escala).map(x => [x.id, x.escala]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return JSON.stringify([e.tipo, e.sentido, e.fuente, e.formula ?? null, e.niveles.map(n => [n.id, n.etiqueta, n.significado, n.valor ?? null]), propias]);
  };
  const escalaValida = (e: EscalaFlujo) => e.fuente.trim() && e.niveles.length > 0 && new Set(e.niveles.map(n => n.id)).size === e.niveles.length
    && e.niveles.every(n => n.id.trim() && n.etiqueta.trim() && n.significado.trim() && (e.tipo !== 'numerica' || typeof n.valor === 'number' && Number.isFinite(n.valor)));
  const escalaCompleta = (c: ConfiguracionFlujo) => escalaValida(c.metodologia.escala) && c.metodologia.criterios.every(x => !x.escala || escalaValida(x.escala));
  if (!escalaCompleta(anterior) || !escalaCompleta(actual) || escalas(anterior) !== escalas(actual)) motivos.push('Las escalas o sus reglas de cálculo no son equivalentes.');
  return { compatible: motivos.length === 0, motivos };
}

/** Agenda informativa: respuestas distintas/incompletas y hallazgos individuales sin vínculo confirmado. No toma decisiones de consenso. */
export interface DiscrepanciasFlujo {
  criterios: Array<{ criterioId: string; respuestas: Array<{ evaluadorId: string; valor: string | null; noAplica: boolean }>; motivos: string[] }>;
  hallazgos: Array<{ evaluadorId: string; hallazgoId: string; criterioIds: string[]; titulo: string }>;
}

export function detectarDiscrepancias(configuracion: ConfiguracionFlujo, trabajos: TrabajoFlujo[]): DiscrepanciasFlujo {
  const criterios: DiscrepanciasFlujo['criterios'] = [];
  for (const criterio of configuracion.metodologia.criterios) {
    const respuestas = trabajos.map(t => {
      const respuesta = t.respuestas.find(r => r.criterioId === criterio.id);
      return { evaluadorId: t.evaluadorId, valor: respuesta?.valor ?? null, noAplica: respuesta?.noAplica ?? false };
    });
    const motivos: string[] = [];
    if (new Set(respuestas.map(r => r.noAplica)).size > 1) motivos.push('Aplicabilidad distinta.');
    if (new Set(respuestas.filter(r => !r.noAplica).map(r => r.valor)).size > 1) motivos.push('Valoraciones distintas.');
    if (respuestas.some(r => !r.noAplica && r.valor === null)) motivos.push('Valoraciones pendientes.');
    if (motivos.length) criterios.push({ criterioId: criterio.id, respuestas, motivos });
  }
  // La semejanza textual no demuestra correspondencia: se revisan todos los originales.
  const hallazgos = trabajos.flatMap(t => t.hallazgos.map(h => ({ evaluadorId: t.evaluadorId, hallazgoId: h.id, criterioIds: [...h.criterioIds], titulo: h.titulo })));
  return { criterios, hallazgos };
}

export type ClaseCriterio = 'favorable' | 'desfavorable' | 'neutro' | 'sin_evaluar' | 'no_aplica';
export interface ClasificacionCriterio { criterioId: string; categoria: string; clase: ClaseCriterio }
/**
 * Clasifica cada criterio del consenso según la escala efectiva del criterio.
 * Mismas reglas que `resumirEvaluacion`: decisión ausente o ambigua, valor desconocido o "no aplica" sin motivo = sin evaluar.
 * Un nivel sin `favorable` es neutro; la favorabilidad nunca se deduce del sentido ni de los valores.
 */
export function clasificarCriterios(configuracion: ConfiguracionFlujo, consenso: ConsensoFlujo): ClasificacionCriterio[] {
  return configuracion.metodologia.criterios.map(criterio => {
    const base = { criterioId: criterio.id, categoria: criterio.categoria };
    const respuestas = consenso.criterios.filter(r => r.criterioId === criterio.id);
    if (respuestas.length !== 1) return { ...base, clase: 'sin_evaluar' as const };
    const respuesta = respuestas[0];
    if (respuesta.noAplica) return { ...base, clase: respuesta.valor === null && respuesta.motivo.trim() ? 'no_aplica' as const : 'sin_evaluar' as const };
    const nivel = escalaDe(configuracion.metodologia, criterio).niveles.find(n => n.id === respuesta.valor);
    if (!nivel) return { ...base, clase: 'sin_evaluar' as const };
    return { ...base, clase: nivel.favorable === true ? 'favorable' as const : nivel.favorable === false ? 'desfavorable' as const : 'neutro' as const };
  });
}

export interface CumplimientoGrupo {
  favorables: number; desfavorables: number; neutros: number; sinEvaluar: number; noAplica: number;
  /** favorables / (favorables + desfavorables), de 0 a 1; null si ningún criterio tiene respuesta favorable o desfavorable. */
  proporcion: number | null;
}
export interface ResumenCumplimiento { total: CumplimientoGrupo; porCategoria: Array<CumplimientoGrupo & { categoria: string }> }

/**
 * Cumplimiento por categoría y total. Devuelve null si ningún criterio usa una escala con niveles favorables
 * (por ejemplo evaluaciones anteriores a esta función): en ese caso no hay nada que mostrar.
 */
export function resumirCumplimiento(configuracion: ConfiguracionFlujo, consenso: ConsensoFlujo): ResumenCumplimiento | null {
  const { metodologia } = configuracion;
  if (!metodologia.criterios.some(c => escalaDe(metodologia, c).niveles.some(n => n.favorable !== undefined))) return null;
  const vacio = (): CumplimientoGrupo => ({ favorables: 0, desfavorables: 0, neutros: 0, sinEvaluar: 0, noAplica: 0, proporcion: null });
  const clave = { favorable: 'favorables', desfavorable: 'desfavorables', neutro: 'neutros', sin_evaluar: 'sinEvaluar', no_aplica: 'noAplica' } as const;
  const total = vacio();
  const grupos = new Map<string, CumplimientoGrupo & { categoria: string }>();
  for (const { categoria, clase } of clasificarCriterios(configuracion, consenso)) {
    const grupo = grupos.get(categoria) ?? { categoria, ...vacio() };
    grupo[clave[clase]]++; total[clave[clase]]++;
    grupos.set(categoria, grupo);
  }
  const proporcion = (g: CumplimientoGrupo) => g.favorables + g.desfavorables > 0 ? g.favorables / (g.favorables + g.desfavorables) : null;
  total.proporcion = proporcion(total);
  const porCategoria = [...grupos.values()];
  porCategoria.forEach(g => { g.proporcion = proporcion(g); });
  return { total, porCategoria };
}
