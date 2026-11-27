import type { AnotacionEvidencia, EvidenciaFlujo } from '@observatorio-ux/shared-types';
import { evaluatorBlob, evaluatorRequest } from '../../shared/api/evaluator-client';

export const rutaEvidencias = (proyectoId: string, evaluacionId: string) =>
  `/projects/${encodeURIComponent(proyectoId)}/evaluacion-heuristica/evaluaciones/${encodeURIComponent(evaluacionId)}/evidencias`;

export async function cargarEvidencia(proyectoId: string, evaluacionId: string, id: string) {
  const ruta = `${rutaEvidencias(proyectoId, evaluacionId)}/${encodeURIComponent(id)}`;
  const [meta, blob] = await Promise.all([evaluatorRequest<EvidenciaFlujo>(`${ruta}/meta`), evaluatorBlob(ruta)]);
  return { meta, blob };
}

/** Para el PDF: la imagen es lo importante; si faltan sus datos (autor, marcas) igual se incluye. Reintenta una vez ante un fallo de red. */
export async function cargarEvidenciaParaInforme(proyectoId: string, evaluacionId: string, id: string) {
  const ruta = `${rutaEvidencias(proyectoId, evaluacionId)}/${encodeURIComponent(id)}`;
  const intentar = async <T,>(f: () => Promise<T>): Promise<T> => { try { return await f(); } catch { return await f(); } };
  const [meta, blob] = await Promise.allSettled([intentar(() => evaluatorRequest<EvidenciaFlujo>(`${ruta}/meta`)), intentar(() => evaluatorBlob(ruta))]);
  if (blob.status === 'rejected') throw blob.reason;
  return { meta: meta.status === 'fulfilled' ? meta.value : null, blob: blob.value };
}

export function subirEvidenciaFlujo(proyectoId: string, evaluacionId: string, archivo: File) {
  const body = new FormData();
  body.append('archivo', archivo);
  return evaluatorRequest<EvidenciaFlujo>(rutaEvidencias(proyectoId, evaluacionId), { method: 'POST', body });
}

export function guardarAnotaciones(proyectoId: string, evaluacionId: string, id: string, anotaciones: AnotacionEvidencia[], revision: number) {
  return evaluatorRequest<EvidenciaFlujo>(`${rutaEvidencias(proyectoId, evaluacionId)}/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ revision, anotaciones }),
  });
}
