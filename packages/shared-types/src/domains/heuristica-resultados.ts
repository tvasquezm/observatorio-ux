import type { ConfiguracionFlujo, ConsensoFlujo, TrabajoFlujo } from './heuristica-flujo';

export interface ResumenEvaluacionFlujo {
  evaluados: number; pendientes: number; noAplica: number;
  porCategoria: Array<{ id: string; etiqueta: string; count: number }>;
  porSeveridad: number[]; totalHallazgos: number;
  indice: number | null; denominador: number; formula: string | null;
}

export function resumirEvaluacion(configuracion: ConfiguracionFlujo, consenso: ConsensoFlujo): ResumenEvaluacionFlujo {
  const { criterios, escala } = configuracion.metodologia;
  const porCategoria = escala.niveles.map(({ id, etiqueta }) => ({ id, etiqueta, count: 0 }));
  const numerica = escala.tipo === 'numerica' && escala.formula === 'media_ponderada'
    && escala.sentido !== 'sin_orden' && escala.niveles.length > 0
    && new Set(escala.niveles.map(n => n.id)).size === escala.niveles.length
    && escala.niveles.every(n => typeof n.valor === 'number' && Number.isFinite(n.valor))
    && criterios.every(c => Number.isFinite(c.peso) && c.peso > 0);
  let evaluados = 0, noAplica = 0, denominador = 0, numerador = 0;
  for (const criterio of criterios) {
    const respuestas = consenso.criterios.filter(r => r.criterioId === criterio.id);
    // Una decisión ambigua permanece pendiente; nunca escoger una respuesta por orden.
    if (respuestas.length !== 1) continue;
    const respuesta = respuestas[0];
    if (respuesta.noAplica) {
      if (respuesta.valor === null && respuesta.motivo.trim()) noAplica++;
      continue;
    }
    const nivel = escala.niveles.find(n => n.id === respuesta.valor);
    if (!nivel) continue;
    evaluados++;
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
  return {
    evaluados, pendientes: criterios.length - evaluados - noAplica, noAplica, porCategoria, porSeveridad,
    totalHallazgos: hallazgos.length, indice, denominador,
    formula: numerica ? 'Σ(valor × peso) / Σ(peso de criterios evaluados aplicables)' : null,
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
    return JSON.stringify([e.tipo, e.sentido, e.fuente, e.formula ?? null, e.niveles.map(n => [n.id, n.etiqueta, n.significado, n.valor ?? null])]);
  };
  const escalaCompleta = (c: ConfiguracionFlujo) => {
    const e = c.metodologia.escala;
    return e.fuente.trim() && e.niveles.length > 0 && new Set(e.niveles.map(n => n.id)).size === e.niveles.length
      && e.niveles.every(n => n.id.trim() && n.etiqueta.trim() && n.significado.trim() && (e.tipo !== 'numerica' || typeof n.valor === 'number' && Number.isFinite(n.valor)));
  };
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
