import type { ConfiguracionFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';

export function pendientesTrabajo(config: ConfiguracionFlujo, respuestas: RespuestaCriterio[], hallazgos: HallazgoFlujo[]) {
  const pendientes = config.metodologia.criterios.filter(c => {
    const r = respuestas.find(r => r.criterioId === c.id);
    return !r || (r.noAplica ? !r.motivo.trim() : !config.metodologia.escala.niveles.some(n => n.id === r.valor));
  }).map(c => `Valora o justifica no aplica: ${c.nombre}`);
  for (const h of hallazgos) if (!h.titulo.trim() || !h.pantalla.trim() || !h.descripcion.trim() || !h.recomendacion.trim() || !h.criterioIds.length) pendientes.push(`Completa el hallazgo: ${h.titulo || 'Sin título'}`);
  return pendientes;
}
export const respuestaVacia = (criterioId: string): RespuestaCriterio => ({ criterioId, valor: null, noAplica: false, motivo: '', notas: '' });
export const hallazgoVacio = (criterioId: string): HallazgoFlujo => ({ id: crypto.randomUUID(), criterioIds: [criterioId], titulo: '', pantalla: '', descripcion: '', recomendacion: '', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] });
