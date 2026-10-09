// Resumen de una evaluación (sin React). Lo usan el panel de la página y el PDF.

import type { HallazgoHeuristica } from './api/evaluacion-heuristica.api';

export const SIN_RESPONSABLE = 'Sin responsable';

export interface ResumenSesion {
  total: number;
  /** Hallazgos con severidad 3 (Mayor) o 4 (Catastrófico). */
  criticos: number;
  /** Promedio de severidad con un decimal; null si no hay hallazgos. */
  promedio: number | null;
  /** Solo heurísticas con hallazgos, de más a menos. */
  porHeuristica: Array<{ heuristicaId: string; count: number }>;
  /** Sin texto de evidencia, sin enlace y sin captura. */
  sinEvidencia: number;
  porResponsable: Array<{ nombre: string; count: number }>;
}

/** Posición en el catálogo (H1..H10); un id legado va al final. Sin depender de valores del paquete compartido. */
function ordenCatalogo(id: string): number {
  const m = /^H(\d+)$/.exec(id);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

export function tieneEvidencia(h: HallazgoHeuristica): boolean {
  return Boolean(h.evidencia?.trim() || h.evidenciaUrl?.trim() || h.evidenciaArchivoId);
}

export function resumirSesion(hallazgos: HallazgoHeuristica[]): ResumenSesion {
  const heuristicas = new Map<string, number>();
  const responsables = new Map<string, number>();
  let suma = 0;
  let criticos = 0;
  let sinEvidencia = 0;

  for (const h of hallazgos) {
    suma += h.severidad;
    if (h.severidad >= 3) criticos++;
    if (!tieneEvidencia(h)) sinEvidencia++;
    heuristicas.set(h.heuristicaId, (heuristicas.get(h.heuristicaId) ?? 0) + 1);
    const nombre = h.responsable?.nombre?.trim() || SIN_RESPONSABLE;
    responsables.set(nombre, (responsables.get(nombre) ?? 0) + 1);
  }

  return {
    total: hallazgos.length,
    criticos,
    promedio: hallazgos.length ? Math.round((suma / hallazgos.length) * 10) / 10 : null,
    porHeuristica: [...heuristicas.entries()]
      .map(([heuristicaId, count]) => ({ heuristicaId, count }))
      .sort((a, b) => b.count - a.count || ordenCatalogo(a.heuristicaId) - ordenCatalogo(b.heuristicaId) || a.heuristicaId.localeCompare(b.heuristicaId)),
    sinEvidencia,
    porResponsable: [...responsables.entries()]
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count || a.nombre.localeCompare(b.nombre, 'es')),
  };
}
