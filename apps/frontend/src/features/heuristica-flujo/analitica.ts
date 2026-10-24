import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';

/** Cada versión nueva de una evaluación apunta a la anterior; solo cuenta la más reciente de cada cadena. */
export function evaluacionesVigentes(evaluaciones: EvaluacionFlujo[]): EvaluacionFlujo[] {
  const reemplazadas = new Set(evaluaciones.map((e) => e.anteriorId).filter(Boolean));
  return evaluaciones.filter((e) => !reemplazadas.has(e.id));
}

export interface AnaliticaHeuristica {
  sesionesTotal: number;
  sesionesCompletadas: number;
  hallazgosTotal: number;
  porSeveridad: Array<{ severidad: number; count: number; porcentaje: number }>;
}

/** Cuenta solo los problemas acordados (aceptados) de evaluaciones consolidadas o finalizadas. */
export function analiticaHeuristica(evaluaciones: EvaluacionFlujo[]): AnaliticaHeuristica {
  const vigentes = evaluacionesVigentes(evaluaciones);
  const conteo = [0, 0, 0, 0, 0];
  for (const { informe } of vigentes) {
    for (const h of informe?.consenso.hallazgos ?? []) if (h.decision === 'ACEPTADO' && conteo[h.severidad] !== undefined) conteo[h.severidad] += 1;
  }
  const hallazgosTotal = conteo.reduce((suma, n) => suma + n, 0);
  return {
    sesionesTotal: vigentes.length,
    sesionesCompletadas: vigentes.filter((e) => e.fase === 'FINALIZADA').length,
    hallazgosTotal,
    porSeveridad: conteo.map((count, severidad) => ({
      severidad, count, porcentaje: hallazgosTotal ? Math.round((count / hallazgosTotal) * 100) : 0,
    })),
  };
}
