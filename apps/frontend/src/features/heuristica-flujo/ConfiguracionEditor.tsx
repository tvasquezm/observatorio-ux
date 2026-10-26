import type { ReactNode } from 'react';
import { copiarMetodologia, escalaDe } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, MetodologiaFlujo, MiembroEquipoFlujo } from '@observatorio-ux/shared-types';
import { CampoUrl } from '../../shared/components/ui/CampoUrl';
import { Field } from './campos';
import { claveDeNombre } from './flujo-utils';

export { Field, Fuente } from './campos';
export function ConfiguracionEditor({ value, onChange, biblioteca, equipo, acciones }: {
  value: ConfiguracionFlujo; onChange: (v: ConfiguracionFlujo) => void;
  biblioteca: MetodologiaFlujo[]; equipo: MiembroEquipoFlujo[]; acciones?: ReactNode;
}) {
  const set = (patch: Partial<ConfiguracionFlujo>) => onChange({ ...value, ...patch });
  const p = value.producto;
  const actual = biblioteca.find(m => m.id === value.metodologia.id || `${m.id}-copia` === value.metodologia.id);
  return <section className="panel hf-config-simple" aria-label="Configuración inicial">
    <div className="hf-config-distribucion"><div><h3>¿Qué vas a revisar?</h3><p className="hf-ayuda">Solo necesitas el producto y una metodología.</p><div className="hf-grid">
      <Field label="Producto o sitio"><input id="hf-producto" maxLength={160} required placeholder="Ej.: portal de estudiantes" value={p.nombre} onChange={e => set({ nombre: !value.nombre || value.nombre === p.nombre ? e.target.value : value.nombre, producto: { ...p, nombre: e.target.value, ...(!p.clave || p.clave === claveDeNombre(p.nombre) ? { clave: claveDeNombre(e.target.value) } : {}) } })} /></Field>
      <Field label="Metodología"><select aria-label="Metodología" value={actual?.id ?? ''} onChange={e => { const elegida = biblioteca.find(m => m.id === e.target.value); if (elegida) set({ metodologia: copiarMetodologia(elegida, `${elegida.id}-copia`, elegida.nombre) }); }}>{!actual && <option value="">{value.metodologia.nombre}</option>}{biblioteca.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></Field>
    </div>
    <div className="hf-resumen-compacto" aria-label="Resumen de la revisión"><span>{value.metodologia.criterios.length} preguntas</span><span>{value.evaluadorIds.length} {value.evaluadorIds.length === 1 ? 'persona' : 'personas'}</span><span>Respuestas incluidas</span></div>
    <details><summary>Personas que revisarán · {value.evaluadorIds.length}</summary>
      <p className="hf-ayuda">Puedes revisar tú o elegir hasta cinco personas del proyecto.</p>
      <fieldset><legend>Equipo de revisión</legend>{equipo.map(u => <label key={u.id} className="hf-check"><input type="checkbox" aria-label={`Evaluador: ${u.nombre}`} checked={value.evaluadorIds.includes(u.id)} disabled={!value.evaluadorIds.includes(u.id) && value.evaluadorIds.length >= 5} onChange={e => set({ evaluadorIds: e.target.checked ? [...value.evaluadorIds, u.id] : value.evaluadorIds.filter(id => id !== u.id) })} />{u.nombre}</label>)}</fieldset>
      <details><summary>Personas que solo verán el informe (opcional)</summary>{equipo.map(u => <label key={u.id} className="hf-check"><input type="checkbox" aria-label={`Lector: ${u.nombre}`} checked={value.lectorIds.includes(u.id)} onChange={e => set({ lectorIds: e.target.checked ? [...value.lectorIds, u.id] : value.lectorIds.filter(id => id !== u.id) })} />{u.nombre}</label>)}</details>
    </details>
    <details><summary>Agregar contexto (opcional)</summary><div className="hf-grid">
      <Field label="Nombre de la revisión (opcional)"><input maxLength={160} value={value.nombre} onChange={e => set({ nombre: e.target.value })} /></Field>
      <Field label="URL (opcional)"><CampoUrl maxLength={1000} value={p.url} onChange={url => set({ producto: { ...p, url } })} /></Field>
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
