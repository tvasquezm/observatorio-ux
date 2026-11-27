import { TECNICAS_INFO } from '../../shared/content/tecnicas-info';
import { InfoTip } from '../../shared/components/ui/InfoTip';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { acuerdoDifiere, escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, CriterioFlujo, DecisionCriterio, EscalaFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { criterioRespondido, faltantesDeGrupo, respuestaVacia } from './flujo-utils';
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
  /** Lleva a una pregunta concreta: abre su sección, la muestra, enfoca su primera respuesta y la resalta. La marca cambia en cada pedido para repetirlo. */
  enfocar?: { criterioId: string; marca: number };
  /** Al pulsar «Sección siguiente» dejando preguntas sin responder: true = volver ahora, false = continuar. Sin esta prop se avanza con un aviso. */
  confirmarAvance?: (mensaje: string) => Promise<boolean>;
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

/** Tiempo que queda resaltada la pregunta a la que se llevó a la persona. */
export const RESALTE_MS = 2500;

/** Tabla calificable: una por ítem, con título y enunciado siempre visibles. */
export function MatrizItem({ criterios, config, respuestas, modo, individuales = [], onChange, hallazgos = [], editable = true, onAddHallazgo, guardado = { dirty: false, saving: false, error: '' }, foco, onFoco, problemasAbiertos, onToggleProblemas, renderProblemas, bloqueado = false, proyectoId, evaluacionId, onEvidencePending, enfocar, confirmarAvance }: Props) {
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
  const [objetivo, setObjetivo] = useState<{ criterioId: string; marca: number } | null>(null);
  const [resaltado, setResaltado] = useState<string | null>(null);
  /** Sección que se dejó con preguntas sin responder al pulsar «Sección siguiente». */
  const [dejada, setDejada] = useState<string | null>(null);
  useEffect(() => { if (enfocar) setObjetivo(enfocar); }, [enfocar?.marca]);
  const irA = (i: number) => { const g = grupos[i]; if (!g) return; setActual(i); onFoco?.(g.criterios[0].id); };
  /** Secciones que la persona dejó con preguntas sin responder: al volver a ellas, esas filas se destacan. */
  const [dejadas, setDejadas] = useState<ReadonlySet<string>>(() => new Set());
  const seccionPrevia = useRef(a);
  useEffect(() => {
    const previa = grupos[seccionPrevia.current];
    seccionPrevia.current = a;
    if (esEquipo || !previa || previa === grupos[a]) return;
    if (faltantesDeGrupo(config, previa, respuestas).length) setDejadas(prev => prev.has(previa.categoria) ? prev : new Set(prev).add(previa.categoria));
  }, [a]);
  const avanzar = async () => {
    const g = grupos[a];
    const faltan = g ? faltantesDeGrupo(config, g, respuestas) : [];
    if (faltan.length && confirmarAvance) {
      const volver = await confirmarAvance(`${faltan.length === 1 ? 'Dejaste 1 pregunta sin responder' : `Dejaste ${faltan.length} preguntas sin responder`} en «${g.categoria}». ¿Quieres responderlas ahora o seguir y volver después?`);
      if (volver) { llevarA(faltan[0].id); return; }
    }
    setDejada(faltan.length ? g.categoria : null);
    irA(a + 1);
  };
  const llevarA = (criterioId: string) => { onFoco?.(criterioId); setObjetivo({ criterioId, marca: Date.now() }); };
  useEffect(() => {
    if (previa.current === actual) return;
    previa.current = actual;
    const t = titulo.current; if (esEquipo || !t) return;
    t.focus({ preventScroll: true });
    const quieto = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    t.scrollIntoView?.({ block: 'start', behavior: quieto ? 'auto' : 'smooth' });
  }, [actual]);
  useEffect(() => {
    if (!objetivo) return;
    const i = grupos.findIndex(g => g.criterios.some(c => c.id === objetivo.criterioId));
    if (i >= 0 && i !== a) { previa.current = i; setActual(i); }
    setResaltado(objetivo.criterioId);
  }, [objetivo]);
  useEffect(() => {
    if (!resaltado || !objetivo) return;
    // Un tick después: si se llegó desde un diálogo, este devuelve el foco al cerrarse y no debe ganarle.
    const enfocarFila = setTimeout(() => {
      const fila = typeof document !== 'undefined' ? document.getElementById(`${id}-${resaltado}-fila`) : null;
      if (!fila) return;
      const quieto = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      fila.scrollIntoView?.({ block: 'center', behavior: quieto ? 'auto' : 'smooth' });
      fila.querySelector<HTMLInputElement>('input[type=radio]:not(:disabled)')?.focus({ preventScroll: true });
    }, 0);
    const t = setTimeout(() => setResaltado(null), RESALTE_MS);
    return () => { clearTimeout(enfocarFila); clearTimeout(t); };
  }, [resaltado, objetivo, actual]);
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
    const faltante = !ok && !esEquipo && dejadas.has(c.categoria);
    return <Fragment key={c.id}>
      <tr id={`${nombre}-fila`} data-respondido={ok || undefined} data-pendiente={resaltado === c.id || undefined} data-faltante={faltante || undefined}>
        <th scope="row" id={`${nombre}-p`}>{c.nombre}{faltante && <span className="hf-faltante-etiqueta"> Sin responder</span>}{conEnunciado && c.descripcion && <small className="hf-enunciado-fila">{c.descripcion}</small>}</th>
        {niveles.map(n => <td key={n.id}><label className="hf-celda" title={n.significado}><input type="radio" name={nombre} disabled={!editable} aria-label={n.etiqueta} aria-describedby={`${nombre}-p`} checked={!r.noAplica && r.valor === n.id} onChange={() => onChange({ ...r, noAplica: false, valor: n.id })} /><span className="hf-celda-txt">{n.etiqueta}</span></label></td>)}
        <td><label className="hf-celda"><input type="radio" name={nombre} disabled={!editable} aria-label="No aplica" aria-describedby={`${nombre}-p`} checked={r.noAplica} onChange={() => onChange({ ...r, noAplica: true, valor: null })} /><span className="hf-celda-txt">No aplica</span></label></td>
        <td className="hf-acciones-fila">
          <button type="button" className="secondary hf-btn-comentario" aria-expanded={abierto} aria-controls={`${nombre}-c`} onClick={() => alternar(c.id)}><span className="hf-btn-comentario-icono" aria-hidden="true">💬</span>Comentario{esEquipo ? ' del equipo' : ''}{' '}<span className="sr-only">de {c.nombre}</span></button>
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
        {esEquipo && r.valor !== null && !r.noAplica && <p className="hf-ayuda">{exige ? 'Escribe una razón: el acuerdo cambia la respuesta de al menos una persona.' : 'Opcional: la respuesta acordada coincide con las individuales.'}</p>}
        <label className="field">Comentario{esEquipo ? ' del equipo' : ''} de {c.nombre}<textarea maxLength={10000} readOnly={!editable} required={exige} value={texto} onChange={e => onChange(esEquipo ? { ...r, justificacion: e.target.value } : { ...r, notas: e.target.value })} /></label>
        {!esEquipo && proyectoId && evaluacionId && <EvidenciaEditor proyectoId={proyectoId} evaluacionId={evaluacionId} evidenciaIds={r.evidenciaIds ?? []} editable={editable} onChange={ids => onChange({ ...r, evidenciaIds: ids })} onPendingChange={v => onEvidencePending?.(c.id, v)} etiqueta="de la valoración" />}
        {r.motivo && <p className="hf-ayuda">Nota anterior: {r.motivo}</p>}
        <button type="button" className="primary" onClick={() => alternar(c.id)}>Listo<span className="sr-only">: comentario de {c.nombre}</span></button>
      </td></tr>}
      {problemasVisibles && <tr id={`${nombre}-pr`} className="hf-fila-problemas"><td colSpan={niveles.length + 3}>{renderProblemas?.(c.id)}<button type="button" className="primary" disabled={bloqueado} onClick={() => onToggleProblemas?.(c.id)}>Listo<span className="sr-only">: problemas de {c.nombre}</span></button></td></tr>}
    </Fragment>;
  }

  function tabla(s: Subgrupo, rotulo: string, conEnunciado: boolean) {
    return <div className="hf-tabla-wrap" key={firmaEscala(s.escala)}><InfoTip label="Ayuda: matriz de evaluación" visibleLabel="¿Cómo leer esto?" align="start">{TECNICAS_INFO['evaluacion-heuristica'].ayudaGraficos.matriz}</InfoTip><table className="hf-matriz">
      <caption className="sr-only">{rotulo}</caption>
      <thead><tr><th scope="col">Pregunta</th>{s.escala.niveles.map(n => <th scope="col" key={n.id}>{n.etiqueta}<small>{n.significado}</small></th>)}<th scope="col">No aplica</th><th scope="col">Acciones</th></tr></thead>
      <tbody>{s.criterios.map(c => fila(c, s.escala.niveles, conEnunciado))}</tbody>
    </table></div>;
  }

  if (!criterios.length) return null;
  return <div className="hf-matrices">
    {esEquipo && <div className="hf-matriz-barra hf-filtro-barra"><span className="hf-filtro-etiqueta" id="hf-filtro-etiqueta">Qué preguntas ver:</span><div className="hf-filtro" role="group" aria-labelledby="hf-filtro-etiqueta"><button type="button" aria-pressed={soloDif} onClick={() => setSoloDif(true)}>Solo diferencias<span className="hf-filtro-n" aria-hidden="true">{criterios.filter(c => !coincidenDe(c.id)).length}</span></button><button type="button" aria-pressed={!soloDif} onClick={() => setSoloDif(false)}>Ver todo<span className="hf-filtro-n" aria-hidden="true">{criterios.length}</span></button></div></div>}
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
            <summary><h3 ref={titulo} tabIndex={-1} id={`${id}-t-${g.categoria}`} className="hf-titulo-seccion">{g.categoria}</h3><span>{completa ? '· ✓ Completa' : `· Faltan ${g.criterios.length - respondidos}`}</span></summary>
            {cuerpo}
          </details>
        </section>;
        const grupoDejado = dejada && dejada !== g.categoria ? grupos.find(x => x.categoria === dejada) : undefined;
        const faltanDejada = grupoDejado ? faltantesDeGrupo(config, grupoDejado, respuestas) : [];
        return <section className="hf-cat" key={g.categoria} aria-labelledby={`${id}-t-${g.categoria}`}>
          {faltanDejada.length > 0 && <div className="hf-aviso-faltantes" role="status"><p>{faltanDejada.length === 1 ? 'Dejaste 1 pregunta sin responder' : `Dejaste ${faltanDejada.length} preguntas sin responder`} en {dejada}.</p><button type="button" className="secondary" disabled={bloqueado} onClick={() => llevarA(faltanDejada[0].id)}>Volver a responderlas</button></div>}
          <h3 ref={titulo} tabIndex={-1} id={`${id}-t-${g.categoria}`}>{g.categoria}</h3>
          {enunciado && <p className="hf-enunciado">{enunciado}</p>}
          <p className="hf-avance">{respondidos} de {g.criterios.length} {esEquipo ? 'acordadas' : 'respondidos'}{respondidos === g.criterios.length ? ' · ✓ Categoría completa' : ''}</p>
          {g.subgrupos.map(s => tabla(s, `${g.categoria}${g.subgrupos.length > 1 ? `: ${s.escala.niveles.map(n => n.etiqueta).join(', ')}` : ''}`, false))}
        </section>;
      })}
    {!esEquipo && grupos.length > 1 && !unaTabla && <div className="hf-navegar">
      <button type="button" className="secondary" disabled={bloqueado || a <= 0} onClick={() => irA(a - 1)}><span aria-hidden="true">←</span> Sección anterior</button>
      {a < grupos.length - 1 && <button type="button" className="secondary" disabled={bloqueado} onClick={() => void avanzar()}>Sección siguiente <span aria-hidden="true">→</span></button>}
    </div>}
  </div>;
}
