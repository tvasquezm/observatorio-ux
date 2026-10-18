import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, CriterioFlujo, CumplimientoGrupo, DiscrepanciasFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';

export function pendientesTrabajo(config: ConfiguracionFlujo, respuestas: RespuestaCriterio[], hallazgos: HallazgoFlujo[]) {
  const pendientes = config.metodologia.criterios.flatMap((c, i) => {
    const r = respuestas.find(r => r.criterioId === c.id);
    if (criterioRespondido(config, c, r)) return [];
    return [`Pregunta ${i + 1}: ${r?.noAplica ? 'marca de nuevo «No aplica» para quitar la valoración anterior' : 'elige una respuesta o marca «No aplica»'} (${c.nombre}).`];
  });
  for (const [i, h] of hallazgos.entries()) {
    const campos = [!h.titulo.trim() && 'título', !h.descripcion.trim() && 'descripción', !h.criterioIds.length && 'pregunta relacionada'].filter(Boolean);
    if (campos.length) pendientes.push(`Problema ${i + 1}${h.titulo ? ` «${h.titulo}»` : ''}: completa ${campos.join(' y ')}.`);
  }
  return pendientes;
}
export const respuestaVacia = (criterioId: string): RespuestaCriterio => ({ criterioId, valor: null, noAplica: false, motivo: '', notas: '' });
export const hallazgoVacio = (criterioId: string): HallazgoFlujo => ({ id: crypto.randomUUID(), criterioIds: [criterioId], titulo: '', pantalla: '', descripcion: '', recomendacion: '', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] });

/** Respondido = un valor válido, o «No aplica» sin valoración; el motivo es opcional. */
export function criterioRespondido(config: ConfiguracionFlujo, criterio: CriterioFlujo, respuesta: RespuestaCriterio | undefined): boolean {
  if (!respuesta) return false;
  return respuesta.noAplica ? respuesta.valor === null : escalaDe(config.metodologia, criterio).niveles.some(n => n.id === respuesta.valor);
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
/** Respuestas distintas de un criterio en discrepancia, con las etiquetas de su escala: "Sí / No". */
export function etiquetasDiscrepancia(config: ConfiguracionFlujo, d: DiscrepanciasFlujo['criterios'][number]): string {
  const criterio = config.metodologia.criterios.find(c => c.id === d.criterioId);
  const niveles = criterio ? escalaDe(config.metodologia, criterio).niveles : [];
  const etiqueta = (r: typeof d.respuestas[number]) => r.noAplica ? 'N.A.' : niveles.find(n => n.id === r.valor)?.etiqueta ?? 'Sin evaluar';
  return [...new Set(d.respuestas.map(etiqueta))].join(' / ');
}

/** Identificador estable del producto derivado del nombre (editable en «Más detalles»). */
export const claveDeNombre = (nombre: string) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
/** Minimum data needed by the student view; descriptive fields are optional. */
export function faltantesParaIniciar(c: ConfiguracionFlujo): string[] {
  return [!c.producto.nombre.trim() && 'producto o sitio', !c.metodologia.criterios.length && 'una metodología con preguntas', !c.evaluadorIds.length && 'al menos una persona en «Personas que revisarán»', !!c.producto.url && (!/^https?:\/\//i.test(c.producto.url) || !URL.canParse(c.producto.url)) && 'una URL válida que comience con http:// o https:// (o déjala vacía)'].filter((v): v is string => !!v);
}
