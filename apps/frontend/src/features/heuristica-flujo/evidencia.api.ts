import type { AnotacionEvidencia, EvidenciaFlujo } from '@observatorio-ux/shared-types';
import { evaluatorBlob, evaluatorRequest } from '../../shared/api/evaluator-client';

export const rutaEvidencias = (proyectoId: string, evaluacionId: string) =>
  `/projects/${encodeURIComponent(proyectoId)}/evaluacion-heuristica/evaluaciones/${encodeURIComponent(evaluacionId)}/evidencias`;

export async function cargarEvidencia(proyectoId: string, evaluacionId: string, id: string) {
  const ruta = `${rutaEvidencias(proyectoId, evaluacionId)}/${encodeURIComponent(id)}`;
  const [meta, blob] = await Promise.all([evaluatorRequest<EvidenciaFlujo>(`${ruta}/meta`), evaluatorBlob(ruta)]);
  return { meta, blob };
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
