import type { ReactNode } from 'react';
import { ESCALA_OPERATIVA_HEURISTICA, claveEscalaPredefinida, copiarMetodologia, escalaDe, escalaPredefinida, normalizarUrlProducto } from '@observatorio-ux/shared-types';
import type { ClaveEscalaPredefinida, ConfiguracionFlujo, EscalaFlujo, MetodologiaFlujo, MiembroEquipoFlujo } from '@observatorio-ux/shared-types';
import { Field } from './campos';
import { claveDeNombre } from './flujo-utils';

export { Field, Fuente } from './campos';

type OpcionEscala = 'metodologia' | 'operativa' | ClaveEscalaPredefinida;
const OPCIONES_ESCALA: { id: OpcionEscala; etiqueta: string }[] = [
  { id: 'metodologia', etiqueta: 'La de la metodología' }, { id: 'operativa', etiqueta: 'Cumple / Parcial / No cumple' },
  { id: 'si_no', etiqueta: 'Sí / No' }, { id: 'likert_1_5', etiqueta: '1 a 5' }, { id: 'nielsen_0_4', etiqueta: 'Severidad 0 a 4 (Nielsen)' },
];
const copiaEscala = (e: EscalaFlujo): EscalaFlujo => JSON.parse(JSON.stringify(e)) as EscalaFlujo;
const escalaDeOpcion = (o: Exclude<OpcionEscala, 'metodologia'>): EscalaFlujo => o === 'operativa' ? copiaEscala(ESCALA_OPERATIVA_HEURISTICA) : escalaPredefinida(o);
export function ConfiguracionEditor({ value, onChange, biblioteca, equipo, acciones }: {
  value: ConfiguracionFlujo; onChange: (v: ConfiguracionFlujo) => void;
  biblioteca: MetodologiaFlujo[]; equipo: MiembroEquipoFlujo[]; acciones?: ReactNode;
}) {
  const set = (patch: Partial<ConfiguracionFlujo>) => onChange({ ...value, ...patch });
  const p = value.producto;
  const actual = biblioteca.find(m => m.id === value.metodologia.id || `${m.id}-copia` === value.metodologia.id);
  const firma = (m: MetodologiaFlujo) => JSON.stringify([m.escala, m.criterios.map(c => c.escala ?? null)]);
  const opcionEscala: OpcionEscala = (() => {
    if (actual && firma(actual) === firma(value.metodologia)) return 'metodologia';
    if (value.metodologia.criterios.some(c => c.escala)) return 'metodologia';
    const clave = claveEscalaPredefinida(value.metodologia.escala);
    if (clave) return clave;
    return JSON.stringify(ESCALA_OPERATIVA_HEURISTICA) === JSON.stringify(value.metodologia.escala) ? 'operativa' : 'metodologia';
  })();
  const cambiarEscala = (o: OpcionEscala) => {
    if (o === 'metodologia') { if (actual) set({ metodologia: copiarMetodologia(actual, `${actual.id}-copia`, actual.nombre) }); return; }
    set({ metodologia: { ...value.metodologia, escala: escalaDeOpcion(o), criterios: value.metodologia.criterios.map(({ escala: _propia, ...resto }) => resto) } });
  };
  return <section className="panel hf-config-simple" aria-label="Configuración inicial">
    <div className="hf-config-distribucion"><div><h3>¿Qué vas a revisar?</h3><p className="hf-ayuda">Solo necesitas el producto y una metodología.</p><div className="hf-grid">
      <Field label="Producto o sitio"><input id="hf-producto" maxLength={160} required placeholder="Ej.: portal de estudiantes" value={p.nombre} onChange={e => set({ nombre: !value.nombre || value.nombre === p.nombre ? e.target.value : value.nombre, producto: { ...p, nombre: e.target.value, ...(!p.clave || p.clave === claveDeNombre(p.nombre) ? { clave: claveDeNombre(e.target.value) } : {}) } })} /></Field>
      <Field label="Metodología"><select aria-label="Metodología" value={actual?.id ?? ''} onChange={e => { const elegida = biblioteca.find(m => m.id === e.target.value); if (elegida) set({ metodologia: copiarMetodologia(elegida, `${elegida.id}-copia`, elegida.nombre) }); }}>{!actual && <option value="">{value.metodologia.nombre}</option>}{biblioteca.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></Field>
      <Field label="Escala de respuesta"><select aria-label="Escala de respuesta" value={opcionEscala} onChange={e => cambiarEscala(e.target.value as OpcionEscala)}>{OPCIONES_ESCALA.map(o => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}</select></Field>
      <div className="hf-niveles-previos" aria-label="Niveles de la escala elegida">{value.metodologia.escala.niveles.map(n => <span key={n.id} title={n.significado}>{n.etiqueta}</span>)}<span>No aplica</span></div>
      <p className="hf-ayuda">Se usa en todas las preguntas de esta revisión. Cambiarla modifica cómo se calcula el cumplimiento: las escalas de 1 a 5 y de 0 a 4 no marcan respuestas favorables.</p>
    </div>
    <div className="hf-resumen-compacto" aria-label="Resumen de la revisión"><span>{value.metodologia.criterios.length} preguntas</span><span>{value.evaluadorIds.length} {value.evaluadorIds.length === 1 ? 'persona' : 'personas'}</span><span>Respuestas incluidas</span></div>
    <details><summary>Personas que revisarán · {value.evaluadorIds.length}</summary>
      <p className="hf-ayuda">Puedes revisar tú o elegir hasta cinco personas del proyecto.</p>
      <fieldset><legend>Equipo de revisión</legend>{equipo.map(u => <label key={u.id} className="hf-check"><input type="checkbox" aria-label={`Evaluador: ${u.nombre}`} checked={value.evaluadorIds.includes(u.id)} disabled={!value.evaluadorIds.includes(u.id) && value.evaluadorIds.length >= 5} onChange={e => set({ evaluadorIds: e.target.checked ? [...value.evaluadorIds, u.id] : value.evaluadorIds.filter(id => id !== u.id) })} />{u.nombre}</label>)}</fieldset>
      <details><summary>Personas que solo verán el informe (opcional)</summary>{equipo.map(u => <label key={u.id} className="hf-check"><input type="checkbox" aria-label={`Lector: ${u.nombre}`} checked={value.lectorIds.includes(u.id)} onChange={e => set({ lectorIds: e.target.checked ? [...value.lectorIds, u.id] : value.lectorIds.filter(id => id !== u.id) })} />{u.nombre}</label>)}</details>
    </details>
    <details><summary>Agregar contexto (opcional)</summary><div className="hf-grid">
      <Field label="Nombre de la revisión (opcional)"><input maxLength={160} value={value.nombre} onChange={e => set({ nombre: e.target.value })} /></Field>
      <Field label="URL (opcional)"><input type="text" inputMode="url" maxLength={1000} placeholder="miweb.cl" value={p.url} onChange={e => set({ producto: { ...p, url: e.target.value } })} onBlur={e => { const url = normalizarUrlProducto(e.target.value); if (url && url !== p.url) set({ producto: { ...p, url } }); }} /></Field>
      <Field label="Objetivo (opcional)"><textarea maxLength={6000} value={value.objetivo} onChange={e => set({ objetivo: e.target.value })} /></Field>
      <Field label="Pantallas incluidas (opcional)"><textarea maxLength={6000} value={value.pantallas} onChange={e => set({ pantallas: e.target.value })} /></Field>
    </div><details><summary>Otros datos del producto (opcional)</summary><div className="hf-grid">
      {(['version', 'dispositivo', 'clave'] as const).map((k, i) => <Field key={k} label={['Versión (opcional)', 'Dispositivo (opcional)', 'Identificador del producto'][i]}><input maxLength={160} value={p[k]} onChange={e => set({ producto: { ...p, [k]: e.target.value } })} /></Field>)}
      {(['tareas', 'exclusiones'] as const).map((k, i) => <Field key={k} label={['Tareas (opcional)', 'Exclusiones (opcional)'][i]}><textarea maxLength={6000} value={value[k]} onChange={e => set({ [k]: e.target.value })} /></Field>)}
    </div></details></details>
    </div><aside className="hf-config-vista" aria-label="Vista previa de la revisión"><p className="hf-ayuda">Así se responde</p><h3>Una pregunta a la vez</h3><p>Elige una respuesta. Si la pregunta no corresponde, marca «No aplica».</p>{value.metodologia.criterios[0] && <div><strong>{value.metodologia.criterios[0].nombre}</strong><div className="hf-niveles-previos">{escalaDe(value.metodologia, value.metodologia.criterios[0]).niveles.map(n => <span key={n.id}>{n.etiqueta}</span>)}<span>No aplica</span></div></div>}<p className="hf-ayuda">{value.metodologia.criterios.length} preguntas listas para revisar</p></aside></div>
    {acciones && <div className="hf-barra">{acciones}</div>}
  </section>;
}
