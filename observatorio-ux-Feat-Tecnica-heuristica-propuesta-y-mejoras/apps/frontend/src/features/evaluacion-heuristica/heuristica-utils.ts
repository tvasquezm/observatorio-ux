// Lógica pura del módulo (sin React): validación del formulario, filtros y
// textos del catálogo. Las reglas replican las del DTO del backend, que
// revalida siempre.

import {
  EVIDENCIA_MAX_BYTES,
  EVIDENCIA_MIME_PERMITIDOS,
  HEURISTICAS_NIELSEN,
  SEVERIDADES,
  type HeuristicaId,
  type SeveridadHeuristica,
  type SeveridadValor,
} from '@observatorio-ux/shared-types';
import type {
  EvaluacionHeuristicaSesion,
  HallazgoHeuristica,
  HallazgoHeuristicaInput,
} from './api/evaluacion-heuristica.api';

export function severidadInfo(valor: number): SeveridadHeuristica {
  return SEVERIDADES.find((s) => s.valor === valor) ?? SEVERIDADES[0];
}

/** "H4 · Consistencia y estándares"; si el id no está en el catálogo (hallazgo legado) devuelve el id tal cual. */
export function etiquetaHeuristica(id: string): string {
  const h = HEURISTICAS_NIELSEN.find((x) => x.id === id);
  return h ? `${h.id} · ${h.nombre}` : id;
}

export function esUrlHttp(valor: string): boolean {
  try {
    const u = new URL(valor);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface HallazgoFormValues {
  heuristicaId: HeuristicaId | '';
  severidad: SeveridadValor;
  titulo: string;
  pantalla: string;
  descripcion: string;
  evidencia: string;
  evidenciaUrl: string;
  evidenciaArchivoId: string | null;
  recomendacion: string;
}

export type ErroresForm = Partial<Record<keyof HallazgoFormValues, string>>;

export function formVacio(): HallazgoFormValues {
  return {
    heuristicaId: '',
    severidad: 2,
    titulo: '',
    pantalla: '',
    descripcion: '',
    evidencia: '',
    evidenciaUrl: '',
    evidenciaArchivoId: null,
    recomendacion: '',
  };
}

export function formDesdeHallazgo(h: HallazgoHeuristica): HallazgoFormValues {
  return {
    heuristicaId: /^H([1-9]|10)$/.test(h.heuristicaId)
      ? (h.heuristicaId as HeuristicaId)
      : '',
    severidad: h.severidad,
    titulo: h.titulo ?? '',
    pantalla: h.pantalla ?? '',
    descripcion: h.descripcion ?? '',
    evidencia: h.evidencia ?? '',
    evidenciaUrl: h.evidenciaUrl ?? '',
    evidenciaArchivoId: h.evidenciaArchivoId ?? null,
    recomendacion: h.recomendacion ?? '',
  };
}

export function validarForm(v: HallazgoFormValues): ErroresForm {
  const e: ErroresForm = {};
  if (!v.heuristicaId) e.heuristicaId = 'Elige la heurística vulnerada.';
  const titulo = v.titulo.trim();
  if (titulo.length < 3) e.titulo = 'El título debe tener al menos 3 caracteres.';
  else if (titulo.length > 120) e.titulo = 'Máximo 120 caracteres.';
  if (!v.pantalla.trim()) e.pantalla = 'Indica la pantalla o elemento evaluado.';
  else if (v.pantalla.trim().length > 200) e.pantalla = 'Máximo 200 caracteres.';
  const descripcion = v.descripcion.trim();
  if (descripcion.length < 10) e.descripcion = 'Describe el problema (mínimo 10 caracteres).';
  else if (descripcion.length > 2000) e.descripcion = 'Máximo 2000 caracteres.';
  if (!v.evidencia.trim()) e.evidencia = 'Describe la evidencia observada.';
  else if (v.evidencia.trim().length > 1000) e.evidencia = 'Máximo 1000 caracteres.';
  const url = v.evidenciaUrl.trim();
  if (url && (!esUrlHttp(url) || url.length > 500)) e.evidenciaUrl = 'Usa una URL http(s) válida.';
  if (!v.recomendacion.trim()) e.recomendacion = 'Propón una acción concreta.';
  else if (v.recomendacion.trim().length > 1000) e.recomendacion = 'Máximo 1000 caracteres.';
  return e;
}

/** Convierte un formulario ya validado en el payload del API. */
export function aInput(v: HallazgoFormValues): HallazgoHeuristicaInput {
  return {
    heuristicaId: v.heuristicaId as HeuristicaId,
    severidad: v.severidad,
    titulo: v.titulo.trim(),
    pantalla: v.pantalla.trim(),
    descripcion: v.descripcion.trim(),
    evidencia: v.evidencia.trim(),
    evidenciaUrl: v.evidenciaUrl.trim() || null,
    evidenciaArchivoId: v.evidenciaArchivoId,
    recomendacion: v.recomendacion.trim(),
  };
}

export function validarArchivoEvidencia(archivo: { size: number; type: string }): string | null {
  if (!(EVIDENCIA_MIME_PERMITIDOS as readonly string[]).includes(archivo.type)) {
    return 'Formato no permitido. Usa PNG, JPEG o WebP.';
  }
  if (archivo.size > EVIDENCIA_MAX_BYTES) return 'La imagen supera el máximo de 2 MB.';
  return null;
}

export interface FiltrosHallazgos {
  severidad: 'todas' | SeveridadValor;
  heuristica: 'todas' | string;
}

export const FILTROS_INICIALES: FiltrosHallazgos = { severidad: 'todas', heuristica: 'todas' };

/** Más severo primero; a igual severidad, el más antiguo primero (orden de registro). */
export function filtrarYOrdenar(hallazgos: HallazgoHeuristica[], f: FiltrosHallazgos): HallazgoHeuristica[] {
  return hallazgos
    .filter((h) => f.severidad === 'todas' || h.severidad === f.severidad)
    .filter((h) => f.heuristica === 'todas' || h.heuristicaId === f.heuristica)
    .sort((a, b) => b.severidad - a.severidad || a.registradoEn.localeCompare(b.registradoEn));
}

/** Conteo por severidad, índice = severidad 0..4. */
export function conteoPorSeveridad(hallazgos: HallazgoHeuristica[]): number[] {
  const conteo = [0, 0, 0, 0, 0];
  for (const h of hallazgos) if (h.severidad >= 0 && h.severidad <= 4) conteo[h.severidad]++;
  return conteo;
}

/**
 * Antes del rediseño las sesiones heurísticas quedaban con el nombre por
 * defecto del modelo ("Card Sorting"); se muestran por fecha en vez de
 * rotularlas con la técnica equivocada.
 */
export function nombreSesion(s: Pick<EvaluacionHeuristicaSesion, 'nombre' | 'createdAt'>): string {
  const nombre = s.nombre?.trim();
  if (nombre && nombre !== 'Card Sorting') return nombre;
  const fecha = new Date(s.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  return `Evaluación del ${fecha}`;
}
