// Resumen para el profesor: cómo va el equipo, quién trabaja, qué revisar, qué encontró
// y qué cambió desde su última visita. Funciones puras sobre los datos ya cargados.
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { evaluacionesVigentes } from '../heuristica-flujo/analitica';
import { coincidenciaEquipo, masRepetidos, MUESTRA_MINIMA_CARD_SORTING, pendientesProyecto, type Pendiente } from './analitica-proyecto';

export type RutaTecnica = 'personas' | 'journey-map' | 'momentos-criticos' | 'card-sorting' | 'evaluacion-heuristica';
export const TECNICAS: Array<{ id: RutaTecnica; titulo: string }> = [
  { id: 'personas', titulo: 'Personas' }, { id: 'journey-map', titulo: 'Journey Map' }, { id: 'momentos-criticos', titulo: 'Momentos críticos' },
  { id: 'card-sorting', titulo: 'Card Sorting' }, { id: 'evaluacion-heuristica', titulo: 'Evaluación heurística' },
];
const RUTA_ARTEFACTO: Record<string, RutaTecnica> = { PERSONA: 'personas', JOURNEY_MAP: 'journey-map', MOMENTOS_CRITICOS: 'momentos-criticos' };

/** Una versión guardada de una persona, journey o momento crítico (el backend devuelve todas). */
export interface VersionArtefacto { tipo: string; artefactoLogicoId: string; version: number; autorId: string; autor?: { id: string; nombre: string } | null; createdAt: string; contenido: unknown }
type Persona = { nombreCompleto?: string; evidencia?: string[]; estadoValidacion?: string; frustraciones?: string[] };
type Journey = { perfilUsuario?: { nombre?: string }; fases?: Array<{ nombre: string; emocion: string; oportunidades?: string[] }> };
type Momento = { perfilUsuario?: { nombre?: string }; incidentes?: Array<{ nombre: string; tipo: string; impacto: string; frecuencia: string; accionesSugeridas?: string[] | string }> };
type Estudio = { id: string; nombre: string; evaluadorId?: string | null; createdAt: string; cerrado?: boolean; respuestasCount?: number };
type Miembro = { usuarioId: string; usuario: { nombre: string; rol?: string } };
type Comentario = { id: string; tecnica: string | null; texto: string; autorId: string; createdAt: string; autor: { nombre: string } };

export interface DatosDocente {
  personas: Array<{ contenido: Persona }>;
  journeys: Array<{ contenido: Journey }>;
  momentos: Array<{ contenido: Momento }>;
  estudios: Estudio[];
  evaluaciones: EvaluacionFlujo[];
  /** Todas las versiones de los artefactos (para autoría y actividad). */
  versiones: VersionArtefacto[];
  miembros: Miembro[];
  comentarios: Comentario[];
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const masReciente = (fechas: Array<string | null | undefined>) => fechas.filter((f): f is string => !!f).sort().at(-1) ?? null;
const nombreEvaluacion = (e: EvaluacionFlujo) => e.configuracion.nombre || e.configuracion.producto.nombre;
const aceptados = (e: EvaluacionFlujo) => (e.informe?.consenso.hallazgos ?? []).filter(h => h.decision === 'ACEPTADO' && h.severidad > 0);
const lista = (v: string[] | string | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(x => x.trim());
const revisiones = (e: EvaluacionFlujo) => e.avanceEquipo?.length
  ? e.avanceEquipo.map(a => ({ evaluadorId: a.evaluadorId, nombre: a.nombre, guardadoEn: a.guardadoEn, entregadoEn: a.entregadoEn }))
  : e.trabajos.map(t => ({ evaluadorId: t.evaluadorId, nombre: t.nombre, guardadoEn: t.guardadoEn, entregadoEn: t.entregadoEn }));

/** Deja solo los datos de las técnicas elegidas: el resto no cuenta, no avisa ni aparece como pendiente. */
export function acotarATecnicas(d: DatosDocente, habilitadas: readonly RutaTecnica[]): DatosDocente {
  const on = (ruta: RutaTecnica) => habilitadas.includes(ruta);
  return {
    ...d,
    personas: on('personas') ? d.personas : [], journeys: on('journey-map') ? d.journeys : [], momentos: on('momentos-criticos') ? d.momentos : [],
    estudios: on('card-sorting') ? d.estudios : [], evaluaciones: on('evaluacion-heuristica') ? d.evaluaciones : [],
    versiones: d.versiones.filter(v => { const ruta = RUTA_ARTEFACTO[v.tipo]; return !ruta || on(ruta); }),
  };
}

/** Técnicas habilitadas de un proyecto; valores desconocidos se ignoran y, sin configuración, valen las cinco. */
export function tecnicasHabilitadas(config?: readonly string[] | null): RutaTecnica[] {
  const validas = TECNICAS.map(t => t.id).filter(id => config?.includes(id));
  return validas.length ? validas : TECNICAS.map(t => t.id);
}

// --- 1. Avance por técnica ---

export type EstadoTecnica = 'completa' | 'en-curso' | 'sin-empezar';
export interface AvanceTecnica { id: RutaTecnica; titulo: string; estado: EstadoTecnica; detalle: string; ultima: string | null }

export function avanceTecnicas(d: DatosDocente): AvanceTecnica[] {
  const ultimaDe = (ruta: RutaTecnica) => masReciente(d.versiones.filter(v => RUTA_ARTEFACTO[v.tipo] === ruta).map(v => v.createdAt));
  const validadas = d.personas.filter(p => p.contenido.estadoValidacion === 'VALIDADA').length;
  const journeysConOportunidades = d.journeys.filter(j => (j.contenido.fases ?? []).some(f => lista(f.oportunidades).length)).length;
  const incidentes = d.momentos.flatMap(m => m.contenido.incidentes ?? []);
  const conAcciones = incidentes.filter(i => lista(i.accionesSugeridas).length).length;
  const estudiosListos = d.estudios.filter(s => s.cerrado && (s.respuestasCount ?? 0) >= MUESTRA_MINIMA_CARD_SORTING).length;
  const vigentes = evaluacionesVigentes(d.evaluaciones);
  const finalizadas = vigentes.filter(e => e.fase === 'FINALIZADA').length;
  const estado = (hay: number, listos: boolean): EstadoTecnica => (!hay ? 'sin-empezar' : listos ? 'completa' : 'en-curso');
  return [
    { id: 'personas', titulo: 'Personas', estado: estado(d.personas.length, validadas === d.personas.length), detalle: d.personas.length ? `${validadas} de ${plural(d.personas.length, 'persona validada', 'personas validadas')}` : 'Sin personas', ultima: ultimaDe('personas') },
    { id: 'journey-map', titulo: 'Journey Map', estado: estado(d.journeys.length, journeysConOportunidades === d.journeys.length && d.journeys.length >= d.personas.length), detalle: d.journeys.length ? `${plural(d.journeys.length, 'journey', 'journeys')} · ${journeysConOportunidades} con oportunidades` : 'Sin journey maps', ultima: ultimaDe('journey-map') },
    { id: 'momentos-criticos', titulo: 'Momentos críticos', estado: estado(incidentes.length, conAcciones === incidentes.length), detalle: incidentes.length ? `${plural(incidentes.length, 'incidente', 'incidentes')} · ${conAcciones} con acciones sugeridas` : 'Sin incidentes', ultima: ultimaDe('momentos-criticos') },
    { id: 'card-sorting', titulo: 'Card Sorting', estado: estado(d.estudios.length, estudiosListos === d.estudios.length), detalle: d.estudios.length ? `${plural(d.estudios.length, 'estudio', 'estudios')} · ${estudiosListos} cerrado${estudiosListos === 1 ? '' : 's'} con muestra suficiente` : 'Sin estudios', ultima: masReciente(d.estudios.map(s => s.createdAt)) },
    { id: 'evaluacion-heuristica', titulo: 'Evaluación heurística', estado: estado(vigentes.length, finalizadas === vigentes.length), detalle: vigentes.length ? `${finalizadas} de ${plural(vigentes.length, 'evaluación finalizada', 'evaluaciones finalizadas')}` : 'Sin evaluaciones', ultima: masReciente(vigentes.map(e => e.updatedAt)) },
  ];
}

// --- 2. Aporte de cada integrante ---

export interface AporteIntegrante { usuarioId: string; nombre: string; porTecnica: Record<RutaTecnica, number>; total: number; ultima: string | null }

/** Cuenta versiones guardadas, estudios creados y revisiones heurísticas de cada persona del equipo. */
export function aporteIntegrantes(d: DatosDocente): AporteIntegrante[] {
  const vacio = (): Record<RutaTecnica, number> => ({ personas: 0, 'journey-map': 0, 'momentos-criticos': 0, 'card-sorting': 0, 'evaluacion-heuristica': 0 });
  const porId = new Map<string, AporteIntegrante>();
  const de = (id: string, nombre?: string) => {
    let a = porId.get(id);
    if (!a) { a = { usuarioId: id, nombre: nombre ?? 'Integrante', porTecnica: vacio(), total: 0, ultima: null }; porId.set(id, a); }
    return a;
  };
  const sumar = (id: string, nombre: string | undefined, ruta: RutaTecnica, fecha: string | null) => {
    const a = de(id, nombre); a.porTecnica[ruta] += 1; a.total += 1; a.ultima = masReciente([a.ultima, fecha]);
  };
  // Solo estudiantes: el docente revisa, no aporta al trabajo del equipo.
  const estudiantes = d.miembros.filter(m => !m.usuario.rol || m.usuario.rol === 'ESTUDIANTE');
  for (const m of estudiantes) de(m.usuarioId, m.usuario.nombre);
  const cuenta = (id: string) => !estudiantes.length || porId.has(id);
  for (const v of d.versiones) { const ruta = RUTA_ARTEFACTO[v.tipo]; if (ruta && cuenta(v.autorId)) sumar(v.autorId, v.autor?.nombre, ruta, v.createdAt); }
  for (const s of d.estudios) if (s.evaluadorId && cuenta(s.evaluadorId)) sumar(s.evaluadorId, undefined, 'card-sorting', s.createdAt);
  for (const e of evaluacionesVigentes(d.evaluaciones)) for (const r of revisiones(e)) if ((r.guardadoEn || r.entregadoEn) && cuenta(r.evaluadorId)) sumar(r.evaluadorId, r.nombre, 'evaluacion-heuristica', masReciente([r.guardadoEn, r.entregadoEn]));
  return [...porId.values()].sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'));
}

// --- 3. Alertas para revisar ---

export function alertasRevision(d: DatosDocente, aportes = aporteIntegrantes(d)): Pendiente[] {
  const lista_: Pendiente[] = pendientesProyecto({ personas: d.personas.length, journeys: d.journeys.length, momentos: d.momentos.length, estudios: d.estudios, evaluaciones: d.evaluaciones });
  const nombres = (xs: string[]) => xs.slice(0, 3).join(', ') + (xs.length > 3 ? ` y ${xs.length - 3} más` : '');
  const sinEvidencia = d.personas.filter(p => !lista(p.contenido.evidencia).length).map(p => p.contenido.nombreCompleto || 'Sin nombre');
  if (sinEvidencia.length) lista_.push({ tipo: 'aviso', texto: `${plural(sinEvidencia.length, 'persona sin evidencia', 'personas sin evidencia')} que la respalde: ${nombres(sinEvidencia)}.`, ruta: 'personas' });
  const sinValidar = d.personas.filter(p => p.contenido.estadoValidacion !== 'VALIDADA').length;
  if (sinValidar) lista_.push({ tipo: 'aviso', texto: `${plural(sinValidar, 'persona pendiente', 'personas pendientes')} de validación.`, ruta: 'personas' });
  const sinOportunidades = d.journeys.filter(j => !(j.contenido.fases ?? []).some(f => lista(f.oportunidades).length)).map(j => j.contenido.perfilUsuario?.nombre || 'Sin perfil');
  if (sinOportunidades.length) lista_.push({ tipo: 'aviso', texto: `${plural(sinOportunidades.length, 'journey sin', 'journeys sin')} oportunidades de mejora: ${nombres(sinOportunidades)}.`, ruta: 'journey-map' });
  const sinAcciones = d.momentos.flatMap(m => m.contenido.incidentes ?? []).filter(i => i.tipo === 'Negativo' && !lista(i.accionesSugeridas).length).length;
  if (sinAcciones) lista_.push({ tipo: 'aviso', texto: `${plural(sinAcciones, 'incidente negativo', 'incidentes negativos')} sin acciones sugeridas.`, ruta: 'momentos-criticos' });
  for (const e of evaluacionesVigentes(d.evaluaciones)) {
    if ((e.configuracion.evaluadorIds?.length ?? 0) === 1) lista_.push({ tipo: 'aviso', texto: `"${nombreEvaluacion(e)}" tiene un solo evaluador: se recomiendan 3 a 5 para una evaluación heurística.`, ruta: 'evaluacion-heuristica' });
    const problemas = aceptados(e);
    const sinCaptura = problemas.filter(h => !h.evidenciaIds?.length).length;
    const sinRecomendacion = problemas.filter(h => !h.recomendacion?.trim()).length;
    if (sinCaptura) lista_.push({ tipo: 'aviso', texto: `En "${nombreEvaluacion(e)}", ${plural(sinCaptura, 'problema no tiene', 'problemas no tienen')} captura de evidencia.`, ruta: 'evaluacion-heuristica' });
    if (sinRecomendacion) lista_.push({ tipo: 'aviso', texto: `En "${nombreEvaluacion(e)}", ${plural(sinRecomendacion, 'problema no tiene', 'problemas no tienen')} recomendación.`, ruta: 'evaluacion-heuristica' });
  }
  for (const c of coincidenciaEquipo(d.evaluaciones)) if (c.coincidencia < 70) lista_.push({ tipo: 'aviso', texto: `Coincidencia baja entre evaluadores en "${c.evaluacion}" (${c.coincidencia}%): conviene revisar las diferencias del acuerdo.`, ruta: 'evaluacion-heuristica' });
  const sinAporte = aportes.filter(a => a.total === 0).map(a => a.nombre);
  if (sinAporte.length && aportes.length > sinAporte.length) lista_.push({ tipo: 'aviso', texto: `${plural(sinAporte.length, 'integrante sin', 'integrantes sin')} aportes registrados: ${nombres(sinAporte)}.`, ruta: 'miembros' });
  return lista_.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'falta' ? -1 : 1));
}

// --- 4. Hallazgos clave ---

export interface HallazgoClave { tecnica: string; texto: string; ruta: RutaTecnica }
const PESO: Record<string, number> = { Alto: 3, Alta: 3, Medio: 2, Media: 2, Bajo: 1, Baja: 1 };

/** Las conclusiones que más pesan, una o dos por técnica, hasta `maximo`. */
export function hallazgosClave(d: DatosDocente, maximo = 5): HallazgoClave[] {
  const r: HallazgoClave[] = [];
  const graves = evaluacionesVigentes(d.evaluaciones).flatMap(e => aceptados(e).map(h => ({ ...h, evaluacion: nombreEvaluacion(e) })))
    .filter(h => h.severidad >= 3).sort((a, b) => b.severidad - a.severidad);
  for (const h of graves.slice(0, 2)) r.push({ tecnica: 'Evaluación heurística', texto: `${h.titulo} (severidad ${h.severidad}, ${h.evaluacion})`, ruta: 'evaluacion-heuristica' });
  const negativos = d.momentos.flatMap(m => (m.contenido.incidentes ?? []).filter(i => i.tipo === 'Negativo').map(i => ({ ...i, perfil: m.contenido.perfilUsuario?.nombre })))
    .sort((a, b) => (PESO[b.impacto] ?? 0) * (PESO[b.frecuencia] ?? 0) - (PESO[a.impacto] ?? 0) * (PESO[a.frecuencia] ?? 0));
  if (negativos[0]) r.push({ tecnica: 'Momento más crítico', texto: `${negativos[0].nombre} (impacto ${negativos[0].impacto.toLowerCase()}, frecuencia ${negativos[0].frecuencia.toLowerCase()}${negativos[0].perfil ? ` · ${negativos[0].perfil}` : ''})`, ruta: 'momentos-criticos' });
  const fases = d.journeys.flatMap(j => j.contenido.fases ?? []).filter(f => f.emocion === 'Negativa').map(f => f.nombre);
  const fase = masRepetidos(fases, 1)[0];
  if (fase) r.push({ tecnica: 'Fase con peor experiencia', texto: fase, ruta: 'journey-map' });
  const frustracion = masRepetidos(d.personas.flatMap(p => p.contenido.frustraciones ?? []), 1)[0];
  if (frustracion) r.push({ tecnica: 'Frustración principal', texto: frustracion, ruta: 'personas' });
  return r.slice(0, maximo);
}

// --- 5. Qué cambió desde la última visita ---

export interface Novedad { fecha: string; texto: string; ruta: RutaTecnica | 'comentarios' }
const TITULO_RUTA = Object.fromEntries(TECNICAS.map(t => [t.id, t.titulo])) as Record<RutaTecnica, string>;

function nombreArtefacto(v: VersionArtefacto): string {
  const c = v.contenido as Persona & Journey;
  return c?.nombreCompleto || c?.perfilUsuario?.nombre || 'sin nombre';
}

export function novedadesDesde(d: DatosDocente, desde: string, usuarioId: string, maximo = 8): Novedad[] {
  const r: Novedad[] = [];
  for (const v of d.versiones) {
    const ruta = RUTA_ARTEFACTO[v.tipo];
    if (!ruta || v.createdAt <= desde || v.autorId === usuarioId) continue;
    r.push({ fecha: v.createdAt, ruta, texto: `${v.autor?.nombre ?? 'Alguien del equipo'} ${v.version === 1 ? 'creó' : 'editó'} ${TITULO_RUTA[ruta].toLowerCase()} · ${nombreArtefacto(v)}` });
  }
  for (const s of d.estudios) if (s.createdAt > desde && s.evaluadorId !== usuarioId) r.push({ fecha: s.createdAt, ruta: 'card-sorting', texto: `Nuevo card sorting · ${s.nombre}` });
  for (const e of evaluacionesVigentes(d.evaluaciones)) {
    for (const rev of revisiones(e)) if (rev.entregadoEn && rev.entregadoEn > desde) r.push({ fecha: rev.entregadoEn, ruta: 'evaluacion-heuristica', texto: `${rev.nombre} entregó su revisión de "${nombreEvaluacion(e)}"` });
    if (e.finalizadoEn && e.finalizadoEn > desde) r.push({ fecha: e.finalizadoEn, ruta: 'evaluacion-heuristica', texto: `Se finalizó la evaluación "${nombreEvaluacion(e)}"` });
  }
  for (const c of d.comentarios) if (c.createdAt > desde && c.autorId !== usuarioId) r.push({ fecha: c.createdAt, ruta: 'comentarios', texto: `${c.autor.nombre} comentó${c.tecnica ? ` en ${TITULO_RUTA[c.tecnica as RutaTecnica] ?? c.tecnica}` : ''}: "${c.texto.length > 70 ? `${c.texto.slice(0, 69)}…` : c.texto}"` });
  return r.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, maximo);
}

/** Comentarios del docente a los que nadie del equipo respondió después (en la misma técnica). */
export function comentariosSinRespuesta(comentarios: Comentario[], usuarioId: string): Comentario[] {
  return comentarios.filter(c => c.autorId === usuarioId && !comentarios.some(o => o.autorId !== usuarioId && o.tecnica === c.tecnica && o.createdAt > c.createdAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
