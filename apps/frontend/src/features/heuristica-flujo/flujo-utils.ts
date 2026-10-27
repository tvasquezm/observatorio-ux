import { acuerdoDifiere, escalaDe, normalizarUrlProducto } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, CriterioFlujo, CumplimientoGrupo, DecisionCriterio, HallazgoFlujo, RespuestaCriterio, TrabajoFlujo } from '@observatorio-ux/shared-types';

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
export const fechaChile = (iso: string | null): string => iso ? new Date(iso).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'medium', timeStyle: 'short' }) : 'fecha no registrada';

export interface ComparacionTrabajo { guardadoPor: string; guardadoEn: string; cambios: string[] }

/** Diferencias entre el trabajo guardado en el servidor y el borrador local, en lenguaje legible. */
export function compararTrabajo(config: ConfiguracionFlujo, remoto: TrabajoFlujo, borrador: { respuestas: RespuestaCriterio[]; hallazgos: HallazgoFlujo[] }): ComparacionTrabajo {
  const valorTexto = (c: CriterioFlujo, r: RespuestaCriterio | undefined) => {
    if (r?.noAplica) return 'No aplica';
    if (!r || r.valor === null) return 'Sin responder';
    return escalaDe(config.metodologia, c).niveles.find(n => n.id === r.valor)?.etiqueta ?? r.valor;
  };
  const cambios: string[] = [];
  for (const [i, c] of config.metodologia.criterios.entries()) {
    const rs = remoto.respuestas.find(r => r.criterioId === c.id);
    const rb = borrador.respuestas.find(r => r.criterioId === c.id);
    const [vs, vb] = [valorTexto(c, rs), valorTexto(c, rb)];
    if (vs !== vb) cambios.push(`Pregunta ${i + 1} (${c.nombre}): en el servidor dice «${vs}» y en tu borrador «${vb}».`);
    else if ((rs?.notas ?? '') !== (rb?.notas ?? '')) cambios.push(`Pregunta ${i + 1} (${c.nombre}): las notas son distintas.`);
  }
  const nombre = (h: HallazgoFlujo) => h.titulo.trim() ? `«${h.titulo}»` : 'sin título';
  for (const hs of remoto.hallazgos) {
    const hb = borrador.hallazgos.find(h => h.id === hs.id);
    if (!hb) { cambios.push(`El problema ${nombre(hs)} está en el servidor y no en tu borrador.`); continue; }
    const campos = [hs.titulo !== hb.titulo && 'título', hs.descripcion !== hb.descripcion && 'descripción', hs.severidad !== hb.severidad && 'severidad', hs.recomendacion !== hb.recomendacion && 'recomendación'].filter(Boolean);
    if (campos.length) cambios.push(`Problema ${nombre(hb)}: cambió ${campos.join(', ')}.`);
  }
  for (const hb of borrador.hallazgos) if (!remoto.hallazgos.some(h => h.id === hb.id)) cambios.push(`Tu borrador tiene el problema ${nombre(hb)}, que aún no está en el servidor.`);
  return { guardadoPor: remoto.nombre, guardadoEn: fechaChile(remoto.guardadoEn), cambios };
}
/** "Sin problemas", "1 problema" o "n problemas" registrados en `donde` (esta pregunta, este ítem). */
export function textoProblemas(n: number, donde: string): string {
  return n === 0 ? `Sin problemas registrados en ${donde}.` : n === 1 ? `1 problema registrado en ${donde}.` : `${n} problemas registrados en ${donde}.`;
}
/** sessionStorage puede estar bloqueado: leer y guardar nunca lanzan; sin él solo se pierde la continuidad. */
export function leerSesion(clave: string): string | null { try { return sessionStorage.getItem(clave); } catch { return null; } }
export function guardarSesion(clave: string, valor: string | null): void { try { if (valor === null) sessionStorage.removeItem(clave); else sessionStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } }
export const respuestaVacia = (criterioId: string): RespuestaCriterio => ({ criterioId, valor: null, noAplica: false, motivo: '', notas: '' });
export const hallazgoVacio = (criterioId: string): HallazgoFlujo => ({ id: crypto.randomUUID(), criterioIds: [criterioId], titulo: '', pantalla: '', descripcion: '', recomendacion: '', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] });

/** Respondido = un valor válido, o «No aplica» sin valoración; el motivo es opcional. */
export function criterioRespondido(config: ConfiguracionFlujo, criterio: CriterioFlujo, respuesta: RespuestaCriterio | undefined): boolean {
  if (!respuesta) return false;
  return respuesta.noAplica ? respuesta.valor === null : escalaDe(config.metodologia, criterio).niveles.some(n => n.id === respuesta.valor);
}
/** "n de N cumplen (x %)" con N = favorables + desfavorables; sin ellos no hay porcentaje que calcular. */
export function textoCumplimiento(g: CumplimientoGrupo): string {
  const valorables = g.favorables + g.desfavorables;
  const base = valorables ? `${g.favorables} de ${valorables} cumplen (${Math.round(g.favorables / valorables * 100)} %)` : 'Sin criterios valorables';
  const extra = [g.sinEvaluar ? `${g.sinEvaluar} sin evaluar` : '', g.noAplica ? `${g.noAplica} no aplica` : ''].filter(Boolean);
  return extra.length ? `${base} · ${extra.join(' · ')}` : base;
}
/** Identificador estable del producto derivado del nombre (editable en «Más detalles»). */
export const claveDeNombre = (nombre: string) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
/** Minimum data needed by the student view; descriptive fields are optional. */
export function faltantesParaIniciar(c: ConfiguracionFlujo): string[] {
  return [!c.producto.nombre.trim() && 'producto o sitio', !c.metodologia.criterios.length && 'una metodología con preguntas', !c.evaluadorIds.length && 'al menos una persona en «Personas que revisarán»', !!c.producto.url.trim() && !normalizarUrlProducto(c.producto.url) && 'una dirección web válida, por ejemplo miweb.cl (o déjala vacía)'].filter((v): v is string => !!v);
}

/** Respuesta común de las preguntas donde todos los evaluadores coinciden y el consenso aún no tiene respuesta. Si no hay nada que precargar devuelve el mismo arreglo. */
export function precargarConsenso(config: ConfiguracionFlujo, trabajos: TrabajoFlujo[], criterios: DecisionCriterio[]): DecisionCriterio[] {
  const nuevos: DecisionCriterio[] = [];
  for (const c of config.metodologia.criterios) {
    const actual = criterios.find(x => x.criterioId === c.id);
    if (actual && (actual.noAplica || actual.valor !== null)) continue;
    const propias = trabajos.map(t => t.respuestas.find(r => r.criterioId === c.id));
    const primera = propias[0];
    if (!primera || (!primera.noAplica && primera.valor === null) || acuerdoDifiere(primera, propias)) continue;
    nuevos.push({ ...respuestaVacia(c.id), valor: primera.valor, noAplica: primera.noAplica, justificacion: actual?.justificacion ?? '' });
  }
  if (!nuevos.length) return criterios;
  const ids = new Set(nuevos.map(n => n.criterioId));
  return [...criterios.filter(x => !ids.has(x.criterioId)), ...nuevos];
}
