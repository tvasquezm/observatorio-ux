import { useEffect, useId, useState } from 'react';
import { escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, CriterioFlujo, EscalaFlujo, HallazgoFlujo, RespuestaCriterio } from '@observatorio-ux/shared-types';
import { criterioRespondido, respuestaVacia } from './flujo-utils';

export interface EstadoGuardado { dirty: boolean; saving: boolean; error: string }
interface Props {
  criterios: CriterioFlujo[];
  config: ConfiguracionFlujo;
  respuestas: RespuestaCriterio[];
  modo: 'individual';
  onChange: (r: RespuestaCriterio) => void;
  hallazgos?: HallazgoFlujo[];
  editable?: boolean;
  onAddHallazgo?: (criterioId: string) => void;
  guardado?: EstadoGuardado;
  /** Criterio al que se quiere llevar la vista (en "Por grupo" abre su ítem). */
  foco?: string;
}
interface Subgrupo { escala: EscalaFlujo; criterios: CriterioFlujo[] }
interface Grupo { categoria: string; criterios: CriterioFlujo[]; subgrupos: Subgrupo[] }

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

type Marca = 'ninguna' | 'pendiente' | 'guardado' | 'error';

/** Tabla calificable: una por ítem, con título y enunciado siempre visibles. */
export function MatrizItem({ criterios, config, respuestas, onChange, hallazgos = [], editable = true, onAddHallazgo, guardado = { dirty: false, saving: false, error: '' }, foco }: Props) {
  const id = useId();
  const grupos = agruparPorItem(config, criterios);
  const [verTodo, setVerTodo] = useState(grupos.length <= 1);
  const [actual, setActual] = useState(() => Math.max(0, grupos.findIndex(g => g.criterios.some(c => c.id === foco))));
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const notasDe = () => Object.fromEntries(respuestas.map(r => [r.criterioId, r.notas]));
  const [guardadas, setGuardadas] = useState<Record<string, string>>(() => guardado.dirty ? {} : notasDe());
  useEffect(() => { if (!guardado.dirty && !guardado.saving && !guardado.error) setGuardadas(notasDe()); }, [guardado.dirty, guardado.saving, guardado.error, respuestas]);
  useEffect(() => { const i = grupos.findIndex(g => g.criterios.some(c => c.id === foco)); if (i >= 0) setActual(i); }, [foco]);
  const visibles = verTodo ? grupos : grupos.slice(Math.min(actual, grupos.length - 1), Math.min(actual, grupos.length - 1) + 1);
  const unaTabla = grupos.length > 1 && grupos.every(g => g.criterios.length === 1);
  const marcaDe = (r: RespuestaCriterio): Marca => !r.notas.trim() ? 'ninguna' : r.notas === guardadas[r.criterioId] ? 'guardado' : guardado.error ? 'error' : 'pendiente';
  const alternar = (cid: string) => setAbiertos(prev => { const n = new Set(prev); if (n.has(cid)) n.delete(cid); else n.add(cid); return n; });

  function fila(c: CriterioFlujo, niveles: EscalaFlujo['niveles'], conEnunciado: boolean) {
    const r = respuestas.find(x => x.criterioId === c.id) ?? respuestaVacia(c.id);
    const marca = marcaDe(r);
    const abierto = abiertos.has(c.id);
    const nombre = `${id}-${c.id}`;
    const problemas = hallazgos.filter(h => h.criterioIds.includes(c.id)).length;
    const ok = criterioRespondido(config, c, respuestas.find(x => x.criterioId === c.id));
    return <>
      <tr key={c.id} data-respondido={ok || undefined}>
        <th scope="row" id={`${nombre}-p`}>{c.nombre}{conEnunciado && c.descripcion && <small className="hf-enunciado-fila">{c.descripcion}</small>}</th>
        {niveles.map(n => <td key={n.id}><label className="hf-celda" title={n.significado}><input type="radio" name={nombre} disabled={!editable} aria-label={n.etiqueta} aria-describedby={`${nombre}-p`} checked={!r.noAplica && r.valor === n.id} onChange={() => onChange({ ...r, noAplica: false, valor: n.id })} /><span className="hf-celda-txt">{n.etiqueta}</span></label></td>)}
        <td><label className="hf-celda"><input type="radio" name={nombre} disabled={!editable} aria-label="No aplica" aria-describedby={`${nombre}-p`} checked={r.noAplica} onChange={() => onChange({ ...r, noAplica: true, valor: null })} /><span className="hf-celda-txt">No aplica</span></label></td>
        <td className="hf-acciones-fila">
          <button type="button" className="ghost" aria-expanded={abierto} aria-controls={`${nombre}-c`} onClick={() => alternar(c.id)}>Comentario<span className="sr-only"> de {c.nombre}</span></button>
          {marca !== 'ninguna' && !abierto && <button type="button" className={`hf-marca hf-marca-${marca}`} title={r.notas} role={marca === 'error' ? 'alert' : undefined} aria-label={`${marca === 'guardado' ? 'Comentario guardado' : marca === 'error' ? 'No se pudo guardar el comentario' : 'Comentario agregado, pendiente de guardar'}. Editar comentario de ${c.nombre}`} onClick={() => alternar(c.id)}>{marca === 'guardado' ? 'Comentario guardado' : marca === 'error' ? 'No se pudo guardar el comentario' : 'Comentario agregado, pendiente de guardar'}</button>}
          {editable && onAddHallazgo && <button type="button" className="secondary" onClick={() => onAddHallazgo(c.id)}>Agregar problema<span className="sr-only"> para {c.nombre}</span></button>}
          {problemas > 0 && <span className="hf-ayuda">{problemas === 1 ? '1 problema' : `${problemas} problemas`}</span>}
        </td>
      </tr>
      {abierto && <tr id={`${nombre}-c`} className="hf-fila-comentario"><td colSpan={niveles.length + 3}>
        <label className="field">Comentario de {c.nombre}<textarea maxLength={10000} readOnly={!editable} value={r.notas} onChange={e => onChange({ ...r, notas: e.target.value })} /></label>
        {r.motivo && <p className="hf-ayuda">Nota anterior: {r.motivo}</p>}
        <button type="button" className="secondary" onClick={() => alternar(c.id)}>Listo<span className="sr-only">: comentario de {c.nombre}</span></button>
      </td></tr>}
    </>;
  }

  function tabla(s: Subgrupo, rotulo: string, conEnunciado: boolean) {
    return <div className="hf-tabla-wrap" key={firmaEscala(s.escala)}><table className="hf-matriz">
      <caption className="sr-only">{rotulo}</caption>
      <thead><tr><th scope="col">Pregunta</th>{s.escala.niveles.map(n => <th scope="col" key={n.id}>{n.etiqueta}<small>{n.significado}</small></th>)}<th scope="col">No aplica</th><th scope="col">Acciones</th></tr></thead>
      <tbody>{s.criterios.map(c => fila(c, s.escala.niveles, conEnunciado))}</tbody>
    </table></div>;
  }

  if (!grupos.length) return null;
  return <div className="hf-matrices">
    {grupos.length > 1 && <div className="hf-matriz-barra">
      <div className="hf-vistas" role="group" aria-label="Cómo ver los ítems"><button type="button" aria-pressed={!verTodo} onClick={() => setVerTodo(false)}>Por grupo</button><button type="button" aria-pressed={verTodo} onClick={() => setVerTodo(true)}>Ver todo</button></div>
      {!verTodo && <div className="hf-navegar"><button type="button" className="secondary" disabled={actual <= 0} onClick={() => setActual(actual - 1)}>Grupo anterior</button><span className="hf-ayuda">Grupo {actual + 1} de {grupos.length}</span><button type="button" className="secondary" disabled={actual >= grupos.length - 1} onClick={() => setActual(actual + 1)}>Grupo siguiente</button></div>}
    </div>}
    {unaTabla ? (() => { const g = { categoria: 'Preguntas', criterios: grupos.flatMap(x => x.criterios), subgrupos: [] as Subgrupo[] };
      for (const x of grupos) for (const s of x.subgrupos) { const e = g.subgrupos.find(y => firmaEscala(y.escala) === firmaEscala(s.escala)); if (e) e.criterios.push(...s.criterios); else g.subgrupos.push({ escala: s.escala, criterios: [...s.criterios] }); }
      return <section className="hf-cat" aria-label="Preguntas">{g.subgrupos.map(s => tabla(s, 'Preguntas', true))}</section>; })()
      : visibles.map(g => {
        const respondidos = g.criterios.filter(c => criterioRespondido(config, c, respuestas.find(r => r.criterioId === c.id))).length;
        const enunciado = config.metodologia.enunciados?.[g.categoria] ?? (g.criterios.length === 1 ? g.criterios[0].descripcion : '');
        return <section className="hf-cat" key={g.categoria} aria-labelledby={`${id}-t-${g.categoria}`}>
          <h3 id={`${id}-t-${g.categoria}`}>{g.categoria}</h3>
          {enunciado && <p className="hf-enunciado">{enunciado}</p>}
          <p className="hf-avance">{respondidos} de {g.criterios.length} respondidos{respondidos === g.criterios.length ? ' · ✓ Categoría completa' : ''}</p>
          {g.subgrupos.map(s => tabla(s, `${g.categoria}${g.subgrupos.length > 1 ? `: ${s.escala.niveles.map(n => n.etiqueta).join(', ')}` : ''}`, false))}
        </section>;
      })}
  </div>;
}
