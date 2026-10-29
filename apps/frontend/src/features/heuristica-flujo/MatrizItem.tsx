import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { acuerdoDifiere, escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, CriterioFlujo, DecisionCriterio, EscalaFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { criterioRespondido, respuestaVacia } from './flujo-utils';
import { EvidenciaEditor } from './EvidenciaEditor';

export interface EstadoGuardado { dirty: boolean; saving: boolean; error: string }
/** Respuestas entregadas por cada evaluador; en el acuerdo del equipo se muestran en solo lectura. */
export interface IndividualEquipo { evaluadorId: string; nombre: string; respuestas: RespuestaCriterio[] }
interface Props {
  criterios: CriterioFlujo[];
  config: ConfiguracionFlujo;
  respuestas: RespuestaCriterio[];
  /** `individual`: el comentario es la nota de la pregunta. `equipo`: cada fila muestra lo que respondió cada persona y el comentario es la justificación del acuerdo. */
  modo: 'individual' | 'equipo';
  onChange: (r: RespuestaCriterio & { justificacion?: string }) => void;
  individuales?: IndividualEquipo[];
  hallazgos?: HallazgoFlujo[];
  editable?: boolean;
  onAddHallazgo?: (criterioId: string) => void;
  guardado?: EstadoGuardado;
  /** Criterio al que se quiere llevar la vista: abre la sección que lo contiene. */
  foco?: string;
  /** Aviso al cambiar de sección con Anterior/Siguiente: primer criterio de la sección abierta. */
  onFoco?: (criterioId: string) => void;
  /** Preguntas con el formulario de problemas abierto bajo su fila (solo con `renderProblemas`). */
  problemasAbiertos?: ReadonlySet<string>;
  onToggleProblemas?: (criterioId: string) => void;
  /** Contenido de los problemas de una pregunta; se muestra en una fila bajo la pregunta. */
  renderProblemas?: (criterioId: string) => ReactNode;
  /** Impide cambiar de sección: lo que hay abierto en las filas se perdería. */
  bloqueado?: boolean;
  /** Con proyecto y evaluación, el comentario de cada pregunta admite capturas de evidencia (solo en modo individual). */
  proyectoId?: string;
  evaluacionId?: string;
  onEvidencePending?: (criterioId: string, pending: boolean) => void;
}
interface Subgrupo { escala: EscalaFlujo; criterios: CriterioFlujo[] }
export interface Grupo { categoria: string; criterios: CriterioFlujo[]; subgrupos: Subgrupo[] }

const firmaEscala = (e: EscalaFlujo) => JSON.stringify(e.niveles.map(n => [n.id, n.etiqueta, n.significado]));

/** Ítems en el orden de la metodología; dentro de cada ítem, filas agrupadas por escala. */
export function agruparPorItem(config: ConfiguracionFlujo, criterios: CriterioFlujo[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const c of criterios) {
    const g = grupos.get(c.categoria) ?? { categoria: c.categoria, criterios: [], subgrupos: [] };
    g.criterios.push(c);
    const escala = escalaDe(config.metodologia, c);
    const sub = g.subgrupos.find(s => firmaEscala(s.escala) === firmaEscala(escala));
    if (sub) sub.criterios.push(c); else g.subgrupos.push({ escala, criterios: [c] });
    grupos.set(c.categoria, g);
  }
  return [...grupos.values()];
}

/** Cada ítem tiene una sola pregunta: se muestran todas en una tabla y no hay secciones. */
export const esUnaTabla = (grupos: Grupo[]) => grupos.length > 1 && grupos.every(g => g.criterios.length === 1);

type Marca = 'ninguna' | 'pendiente' | 'guardado' | 'error';
const textoRespuesta = (r: RespuestaCriterio | undefined, niveles: EscalaFlujo['niveles']) => !r ? 'Sin evaluar' : r.noAplica ? 'No aplica' : niveles.find(n => n.id === r.valor)?.etiqueta ?? 'Sin evaluar';

/** Tabla calificable: una por ítem, con título y enunciado siempre visibles. */
export function MatrizItem({ criterios, config, respuestas, modo, individuales = [], onChange, hallazgos = [], editable = true, onAddHallazgo, guardado = { dirty: false, saving: false, error: '' }, foco, onFoco, problemasAbiertos, onToggleProblemas, renderProblemas, bloqueado = false, proyectoId, evaluacionId, onEvidencePending }: Props) {
  const id = useId();
  const esEquipo = modo === 'equipo';
  const propiasDe = (cid: string) => individuales.map(i => ({ i, r: i.respuestas.find(x => x.criterioId === cid) }));
  const coincidenDe = (cid: string) => { const p = propiasDe(cid); return p.length > 0 && p[0].r !== undefined && !acuerdoDifiere(p[0].r, p.map(x => x.r)); };
  const [soloDif, setSoloDif] = useState(false);
  const grupos = agruparPorItem(config, esEquipo && soloDif ? criterios.filter(c => !coincidenDe(c.id)) : criterios);
  const [actual, setActual] = useState(() => Math.max(0, grupos.findIndex(g => g.criterios.some(c => c.id === foco))));
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [completasAlInicio] = useState(() => new Set(esEquipo ? agruparPorItem(config, criterios).filter(g => g.criterios.every(c => criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id)))).map(g => g.categoria) : []));
  const [categoriaAbierta, setCategoriaAbierta] = useState<Record<string, boolean>>({});
  const textoDe = (r: RespuestaCriterio) => esEquipo ? (r as Partial<DecisionCriterio>).justificacion ?? '' : r.notas;
  const notasDe = () => Object.fromEntries(respuestas.map(r => [r.criterioId, textoDe(r)]));
  const [guardadas, setGuardadas] = useState<Record<string, string>>(() => guardado.dirty ? {} : notasDe());
  useEffect(() => { if (!guardado.dirty && !guardado.saving && !guardado.error) setGuardadas(notasDe()); }, [guardado.dirty, guardado.saving, guardado.error, respuestas]);
  useEffect(() => { const i = grupos.findIndex(g => g.criterios.some(c => c.id === foco)); if (i >= 0) setActual(i); }, [foco]);
  const a = Math.min(actual, Math.max(grupos.length - 1, 0));
  const visibles = esEquipo ? grupos : grupos.slice(a, a + 1);
  const unaTabla = esUnaTabla(grupos);
  const titulo = useRef<HTMLHeadingElement>(null);
  const previa = useRef(actual);
  const irA = (i: number) => { const g = grupos[i]; if (!g) return; setActual(i); onFoco?.(g.criterios[0].id); };
  useEffect(() => {
    if (previa.current === actual) return;
    previa.current = actual;
    const t = titulo.current; if (esEquipo || !t) return;
    t.focus({ preventScroll: true });
    const quieto = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    t.scrollIntoView?.({ block: 'start', behavior: quieto ? 'auto' : 'smooth' });
  }, [actual]);
  const marcaDe = (r: RespuestaCriterio): Marca => { const t = textoDe(r); return !t.trim() ? 'ninguna' : t === guardadas[r.criterioId] ? 'guardado' : guardado.error ? 'error' : 'pendiente'; };
  const alternar = (cid: string) => setAbiertos(prev => { const n = new Set(prev); if (n.has(cid)) n.delete(cid); else n.add(cid); return n; });

  function fila(c: CriterioFlujo, niveles: EscalaFlujo['niveles'], conEnunciado: boolean) {
    const r = respuestas.find(x => x.criterioId === c.id) ?? respuestaVacia(c.id);
    const texto = textoDe(r);
    const propias = propiasDe(c.id);
    const exige = esEquipo && !r.noAplica && r.valor !== null && propias.length > 0 && acuerdoDifiere(r, propias.map(p => p.r));
    const marca = marcaDe(r);
    const abierto = abiertos.has(c.id);
    const nombre = `${id}-${c.id}`;
    const problemas = hallazgos.filter(h => renderProblemas ? h.criterioIds[0] === c.id : h.criterioIds.includes(c.id)).length;
    const textoProblemas = problemas === 1 ? '1 problema' : `${problemas} problemas`;
    const problemasVisibles = !!renderProblemas && problemas > 0 && !!problemasAbiertos?.has(c.id);
    const ok = criterioRespondido(config, c, respuestas.find(x => x.criterioId === c.id));
    return <Fragment key={c.id}>
      <tr data-respondido={ok || undefined}>
        <th scope="row" id={`${nombre}-p`}>{c.nombre}{conEnunciado && c.descripcion && <small className="hf-enunciado-fila">{c.descripcion}</small>}</th>
        {niveles.map(n => <td key={n.id}><label className="hf-celda" title={n.significado}><input type="radio" name={nombre} disabled={!editable} aria-label={n.etiqueta} aria-describedby={`${nombre}-p`} checked={!r.noAplica && r.valor === n.id} onChange={() => onChange({ ...r, noAplica: false, valor: n.id })} /><span className="hf-celda-txt">{n.etiqueta}</span></label></td>)}
        <td><label className="hf-celda"><input type="radio" name={nombre} disabled={!editable} aria-label="No aplica" aria-describedby={`${nombre}-p`} checked={r.noAplica} onChange={() => onChange({ ...r, noAplica: true, valor: null })} /><span className="hf-celda-txt">No aplica</span></label></td>
        <td className="hf-acciones-fila">
          <button type="button" className="ghost" aria-expanded={abierto} aria-controls={`${nombre}-c`} onClick={() => alternar(c.id)}>Comentario{esEquipo ? ' del equipo' : ''}{' '}<span className="sr-only">de {c.nombre}</span></button>
          {marca !== 'ninguna' && !abierto && <button type="button" className={`hf-marca hf-marca-${marca}`} title={texto} role={marca === 'error' ? 'alert' : undefined} aria-label={`${marca === 'guardado' ? 'Comentario guardado' : marca === 'error' ? `Comentario sin guardar: ${guardado.error}` : 'Comentario agregado, pendiente de guardar'}. Editar comentario de ${c.nombre}`} onClick={() => alternar(c.id)}>{marca === 'guardado' ? 'Comentario guardado' : marca === 'error' ? `Comentario sin guardar: ${guardado.error}` : 'Comentario agregado, pendiente de guardar'}</button>}
          {editable && onAddHallazgo && <button type="button" className="secondary" onClick={() => onAddHallazgo(c.id)}>Agregar problema{' '}<span className="sr-only">para {c.nombre}</span></button>}
          {problemas > 0 && (renderProblemas && onToggleProblemas ? <button type="button" className="hf-contador-problemas" aria-expanded={problemasVisibles} aria-controls={`${nombre}-pr`} onClick={() => onToggleProblemas(c.id)}>{textoProblemas}{' '}<span className="sr-only">de {c.nombre}</span></button> : <span className="hf-ayuda">{textoProblemas}</span>)}
          {exige && !texto.trim() && <span className="hf-ayuda">Falta el comentario del equipo</span>}
        </td>
      </tr>
      {esEquipo && <tr className="hf-fila-individual"><td colSpan={niveles.length + 3}>
        <strong className={`hf-diferencia ${coincidenDe(c.id) ? 'hf-coinciden' : 'hf-difieren'}`}>{coincidenDe(c.id) ? 'Coinciden' : 'Difieren'}</strong>
        <ul className="hf-individuales">{propias.map(p => <li key={p.i.evaluadorId}>{p.i.nombre}: {textoRespuesta(p.r, niveles)}</li>)}</ul>
      </td></tr>}
      {abierto && <tr id={`${nombre}-c`} className="hf-fila-comentario"><td colSpan={niveles.length + 3}>
        {esEquipo && propias.filter(p => p.r?.notas.trim()).map(p => <p key={p.i.evaluadorId} className="hf-ayuda">Comentario individual de {p.i.nombre}: {p.r?.notas}</p>)}
        {esEquipo && r.valor !== null && !r.noAplica && <p className="hf-ayuda">{exige ? 'Obligatorio: la respuesta acordada difiere de alguna individual.' : 'Opcional: la respuesta acordada coincide con las individuales.'}</p>}
        <label className="field">Comentario{esEquipo ? ' del equipo' : ''} de {c.nombre}<textarea maxLength={10000} readOnly={!editable} required={exige} value={texto} onChange={e => onChange(esEquipo ? { ...r, justificacion: e.target.value } : { ...r, notas: e.target.value })} /></label>
        {!esEquipo && proyectoId && evaluacionId && <EvidenciaEditor proyectoId={proyectoId} evaluacionId={evaluacionId} evidenciaIds={r.evidenciaIds ?? []} editable={editable} onChange={ids => onChange({ ...r, evidenciaIds: ids })} onPendingChange={v => onEvidencePending?.(c.id, v)} etiqueta="de la valoración" />}
        {r.motivo && <p className="hf-ayuda">Nota anterior: {r.motivo}</p>}
        <button type="button" className="primary" onClick={() => alternar(c.id)}>Listo<span className="sr-only">: comentario de {c.nombre}</span></button>
      </td></tr>}
      {problemasVisibles && <tr id={`${nombre}-pr`} className="hf-fila-problemas"><td colSpan={niveles.length + 3}>{renderProblemas?.(c.id)}<button type="button" className="primary" disabled={bloqueado} onClick={() => onToggleProblemas?.(c.id)}>Listo<span className="sr-only">: problemas de {c.nombre}</span></button></td></tr>}
    </Fragment>;
  }

  function tabla(s: Subgrupo, rotulo: string, conEnunciado: boolean) {
    return <div className="hf-tabla-wrap" key={firmaEscala(s.escala)}><table className="hf-matriz">
      <caption className="sr-only">{rotulo}</caption>
      <thead><tr><th scope="col">Pregunta</th>{s.escala.niveles.map(n => <th scope="col" key={n.id}>{n.etiqueta}<small>{n.significado}</small></th>)}<th scope="col">No aplica</th><th scope="col">Acciones</th></tr></thead>
      <tbody>{s.criterios.map(c => fila(c, s.escala.niveles, conEnunciado))}</tbody>
    </table></div>;
  }

  if (!criterios.length) return null;
  return <div className="hf-matrices">
    {esEquipo && <div className="hf-matriz-barra"><div className="hf-vistas" role="group" aria-label="Qué preguntas ver"><button type="button" aria-pressed={soloDif} onClick={() => setSoloDif(true)}>Solo diferencias</button><button type="button" aria-pressed={!soloDif} onClick={() => setSoloDif(false)}>Ver todo</button></div></div>}
    {!grupos.length && <p className="hf-ayuda" role="status">Las respuestas individuales coinciden en todas las preguntas.</p>}
    {unaTabla ? (() => { const g = { categoria: 'Preguntas', criterios: grupos.flatMap(x => x.criterios), subgrupos: [] as Subgrupo[] };
      for (const x of grupos) for (const s of x.subgrupos) { const e = g.subgrupos.find(y => firmaEscala(y.escala) === firmaEscala(s.escala)); if (e) e.criterios.push(...s.criterios); else g.subgrupos.push({ escala: s.escala, criterios: [...s.criterios] }); }
      return <section className="hf-cat" aria-label="Preguntas">{g.subgrupos.map(s => tabla(s, 'Preguntas', true))}</section>; })()
      : visibles.map(g => {
        const respondidos = g.criterios.filter(c => criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id))).length;
        const enunciado = config.metodologia.enunciados?.[g.categoria] ?? (g.criterios.length === 1 ? g.criterios[0].descripcion : '');
        const completa = respondidos === g.criterios.length;
        const cuerpo = <>
          {enunciado && <p className="hf-enunciado">{enunciado}</p>}
          <p className="hf-avance">{respondidos} de {g.criterios.length} {esEquipo ? 'acordadas' : 'respondidos'}{completa ? ' · ✓ Categoría completa' : ''}</p>
          {g.subgrupos.map(s => tabla(s, `${g.categoria}${g.subgrupos.length > 1 ? `: ${s.escala.niveles.map(n => n.etiqueta).join(', ')}` : ''}`, false))}
        </>;
        if (esEquipo) return <section className="hf-cat" key={g.categoria} aria-labelledby={`${id}-t-${g.categoria}`}>
          <details open={categoriaAbierta[g.categoria] ?? !completasAlInicio.has(g.categoria)} onToggle={e => { const abierta = e.currentTarget.open; setCategoriaAbierta(m => m[g.categoria] === abierta ? m : { ...m, [g.categoria]: abierta }); }}>
            <summary><h3 ref={titulo} tabIndex={-1} id={`${id}-t-${g.categoria}`} style={{ display: 'inline', marginRight: 8 }}>{g.categoria}</h3><span>{completa ? '· ✓ Completa' : `· Faltan ${g.criterios.length - respondidos}`}</span></summary>
            {cuerpo}
          </details>
        </section>;
        return <section className="hf-cat" key={g.categoria} aria-labelledby={`${id}-t-${g.categoria}`}>
          <h3 ref={titulo} tabIndex={-1} id={`${id}-t-${g.categoria}`}>{g.categoria}</h3>
          {enunciado && <p className="hf-enunciado">{enunciado}</p>}
          <p className="hf-avance">{respondidos} de {g.criterios.length} {esEquipo ? 'acordadas' : 'respondidos'}{respondidos === g.criterios.length ? ' · ✓ Categoría completa' : ''}</p>
          {g.subgrupos.map(s => tabla(s, `${g.categoria}${g.subgrupos.length > 1 ? `: ${s.escala.niveles.map(n => n.etiqueta).join(', ')}` : ''}`, false))}
        </section>;
      })}
    {!esEquipo && grupos.length > 1 && !unaTabla && <div className="hf-navegar">
      <button type="button" className="secondary" disabled={bloqueado || a <= 0} onClick={() => irA(a - 1)}><span aria-hidden="true">←</span> Sección anterior</button>
      <button type="button" className="secondary" disabled={bloqueado || a >= grupos.length - 1} onClick={() => irA(a + 1)}>Sección siguiente <span aria-hidden="true">→</span></button>
    </div>}
  </div>;
}
