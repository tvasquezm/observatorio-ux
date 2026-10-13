import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, CriterioFlujo, CumplimientoGrupo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';

export function pendientesTrabajo(config: ConfiguracionFlujo, respuestas: RespuestaCriterio[], hallazgos: HallazgoFlujo[]) {
  const pendientes = config.metodologia.criterios.filter(c => !criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id))).map(c => `Valora o justifica no aplica: ${c.nombre}`);
  for (const h of hallazgos) if (!h.titulo.trim() || !h.pantalla.trim() || !h.descripcion.trim() || !h.recomendacion.trim() || !h.criterioIds.length) pendientes.push(`Completa el hallazgo: ${h.titulo || 'Sin título'}`);
  return pendientes;
}
export const respuestaVacia = (criterioId: string): RespuestaCriterio => ({ criterioId, valor: null, noAplica: false, motivo: '', notas: '' });
export const hallazgoVacio = (criterioId: string): HallazgoFlujo => ({ id: crypto.randomUUID(), criterioIds: [criterioId], titulo: '', pantalla: '', descripcion: '', recomendacion: '', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] });

/** Respondido = valor válido para la escala efectiva del criterio, o "no aplica" con motivo. */
export function criterioRespondido(config: ConfiguracionFlujo, criterio: CriterioFlujo, respuesta: RespuestaCriterio | undefined): boolean {
  if (!respuesta) return false;
  return respuesta.noAplica ? !!respuesta.motivo.trim() : escalaDe(config.metodologia, criterio).niveles.some(n => n.id === respuesta.valor);
}
/** Vista checklist (D22): solo si todos los criterios se responden con exactamente dos niveles. */
export function esChecklist(config: ConfiguracionFlujo): boolean {
  const { criterios } = config.metodologia;
  return criterios.length > 0 && criterios.every(c => escalaDe(config.metodologia, c).niveles.length === 2);
}
export interface AvanceCategoria { categoria: string; criterios: CriterioFlujo[]; respondidos: number }
/** Categorías en el orden en que aparecen en la metodología, con cuántos criterios tienen respuesta. */
export function avancePorCategoria(config: ConfiguracionFlujo, respuestas: RespuestaCriterio[]): AvanceCategoria[] {
  const grupos = new Map<string, AvanceCategoria>();
  for (const c of config.metodologia.criterios) {
    const g = grupos.get(c.categoria) ?? { categoria: c.categoria, criterios: [], respondidos: 0 };
    g.criterios.push(c);
    if (criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id))) g.respondidos++;
    grupos.set(c.categoria, g);
  }
  return [...grupos.values()];
}
/** "n de N cumplen (x %)" con N = favorables + desfavorables; sin ellos no hay porcentaje que calcular. */
export function textoCumplimiento(g: CumplimientoGrupo): string {
  const valorables = g.favorables + g.desfavorables;
  const base = valorables ? `${g.favorables} de ${valorables} cumplen (${Math.round(g.favorables / valorables * 100)} %)` : 'Sin criterios valorables';
  const extra = [g.sinEvaluar ? `${g.sinEvaluar} sin evaluar` : '', g.noAplica ? `${g.noAplica} no aplica` : ''].filter(Boolean);
  return extra.length ? `${base} · ${extra.join(' · ')}` : base;
}
