import type { ReactNode } from 'react';
import { useState } from 'react';
import { copiarMetodologia, combinarMetodologias } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EscalaFlujo, MetodologiaFlujo, MiembroEquipoFlujo } from '@observatorio-ux/shared-types';
import { useAuthStore } from '../auth/store/useAuthStore';

export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field">{label}{children}</label>; }
export function Fuente({ value }: { value: string }) { return /^https?:\/\//i.test(value) ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : <span>{value}</span>; }
export function ConfiguracionEditor({ value, onChange, biblioteca, equipo, onSaveMethod }: {
  value: ConfiguracionFlujo; onChange: (v: ConfiguracionFlujo) => void; biblioteca: MetodologiaFlujo[];
  equipo: MiembroEquipoFlujo[]; onSaveMethod: (m: MetodologiaFlujo) => Promise<void>;
}) {
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const author = useAuthStore(s => s.user?.nombre ?? 'Autor de la evaluación');
  const set = (patch: Partial<ConfiguracionFlujo>) => onChange({ ...value, ...patch });
  const m = value.metodologia;
  const method = (patch: Partial<MetodologiaFlujo>) => set({ metodologia: { ...m, ...patch, protegida: false } });
  const escala = (patch: Partial<EscalaFlujo>) => method({ escala: { ...m.escala, ...patch } });
  return <>
    <section className="panel">
      <div className="panel-head"><h2>Producto y alcance</h2></div>
      <Field label="Nombre de la evaluación"><input maxLength={160} value={value.nombre} onChange={e => set({ nombre: e.target.value })} /></Field>
      <div className="hf-grid">{(['clave', 'nombre', 'version', 'url', 'dispositivo'] as const).map((k, i) => <Field key={k} label={['Identificador estable del producto', 'Nombre del producto', 'Versión del producto', 'URL del producto', 'Dispositivo / entorno'][i]}><input maxLength={k === 'url' ? 1000 : 160} value={value.producto[k]} onChange={e => set({ producto: { ...value.producto, [k]: e.target.value } })} /></Field>)}</div>
      <div className="hf-grid">{(['objetivo', 'tareas', 'pantallas', 'exclusiones'] as const).map((k, i) => <Field key={k} label={['Objetivo', 'Tareas a evaluar', 'Pantallas incluidas', 'Exclusiones'][i]}><textarea maxLength={6000} value={value[k]} onChange={e => set({ [k]: e.target.value })} /></Field>)}</div>
    </section>
    <section className="panel">
      <div className="panel-head"><h2>Biblioteca de metodologías</h2></div>
      <p>Los originales están protegidos. Trabajas sobre una copia; cada criterio conserva su autor y fuente. WCAG y COGA orientan la revisión, sin certificar conformidad.</p>
      {biblioteca.map(original => <details key={original.id}><summary>{original.nombre} · {original.protegida ? 'Original protegido' : 'Copia personal'}</summary>
        <p>{original.autor} · {original.version} · {original.ambito}</p><Fuente value={original.fuente} />
        <ul>{original.criterios.map(c => <li key={c.id}>{c.nombre}: {c.descripcion}</li>)}</ul>
        <label className="hf-check"><input type="checkbox" checked={seleccion.includes(original.id)} onChange={e => setSeleccion(e.target.checked ? [...seleccion, original.id] : seleccion.filter(id => id !== original.id))} />Combinar {original.nombre}</label>
        <button type="button" onClick={() => set({ metodologia: copiarMetodologia(original) })}>Usar copia de {original.nombre}</button>
      </details>)}
      <button type="button" disabled={seleccion.length < 2} onClick={() => set({ metodologia: combinarMetodologias(biblioteca.filter(x => seleccion.includes(x.id))) })}>Combinar seleccionadas conservando origen</button>
    </section>
    <section className="panel">
      <div className="panel-head"><h2>Criterios de esta copia</h2></div>
      <Field label="Nombre de la metodología personalizada"><input maxLength={160} value={m.nombre} onChange={e => method({ nombre: e.target.value })} /></Field>
      {m.criterios.map((c, index) => <fieldset key={c.id}><legend>Criterio {index + 1}</legend>
        <Field label={`Nombre del criterio ${index + 1}`}><input maxLength={300} value={c.nombre} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, nombre: e.target.value } : x) })} /></Field>
        <Field label={`Descripción del criterio ${index + 1}`}><textarea maxLength={6000} value={c.descripcion} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, descripcion: e.target.value } : x) })} /></Field>
        <div className="hf-grid"><Field label={`Categoría del criterio ${index + 1}`}><input value={c.categoria} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, categoria: e.target.value } : x) })} /></Field>
          <Field label={`Peso del criterio ${index + 1}`}><input type="number" min="0.001" step="any" value={c.peso} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, peso: Number(e.target.value) } : x) })} /></Field></div>
        <p className="hf-origin">Origen: {c.origen.autor} · {c.origen.version} · <Fuente value={c.origen.fuente} /></p>
        <div className="hf-actions">{([-1, 1] as const).map(direction => <button key={direction} type="button" aria-label={`${direction === -1 ? 'Subir' : 'Bajar'} criterio ${index + 1}`} disabled={index + direction < 0 || index + direction >= m.criterios.length} onClick={() => { const criterios = [...m.criterios]; [criterios[index], criterios[index + direction]] = [criterios[index + direction], criterios[index]]; method({ criterios }); }}>{direction === -1 ? '↑ Subir' : '↓ Bajar'}</button>)}<button type="button" onClick={() => method({ criterios: m.criterios.filter(x => x.id !== c.id) })}>Quitar criterio {index + 1}</button></div>
      </fieldset>)}
      <div className="hf-actions"><button type="button" onClick={() => method({ criterios: [...m.criterios, { id: crypto.randomUUID(), nombre: '', descripcion: '', categoria: 'Personalizado', peso: 1, origen: { metodologiaId: m.id, autor: author, fuente: `Definición propia de ${author}`, version: '1', tipo: 'personalizado' } }] })}>Agregar criterio</button>
        <button type="button" disabled={saving} onClick={async () => { setSaving(true); setError(''); try { await onSaveMethod(m); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la metodología'); } finally { setSaving(false); } }}>Guardar metodología reutilizable</button></div>
      {error && <p role="alert" className="hf-error">{error}</p>}
    </section>
    <section className="panel"><div className="panel-head"><h2>Escala de valoración</h2></div>
      <div className="hf-grid"><Field label="Tipo de escala"><select value={m.escala.tipo} onChange={e => escala({ tipo: e.target.value as EscalaFlujo['tipo'], formula: undefined })}>{['categorica', 'ordinal', 'numerica', 'cualitativa'].map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Sentido favorable"><select value={m.escala.sentido} onChange={e => escala({ sentido: e.target.value as EscalaFlujo['sentido'] })}><option value="mayor_mejor">Mayor es mejor</option><option value="menor_mejor">Menor es mejor</option><option value="sin_orden">Sin orden</option></select></Field></div>
      <Field label="Fuente o definición de la escala"><input value={m.escala.fuente} onChange={e => escala({ fuente: e.target.value })} /></Field>
      {m.escala.niveles.map((n, i) => <fieldset key={n.id}><legend>Nivel {i + 1}</legend><div className="hf-grid">
        <Field label={`Etiqueta del nivel ${i + 1}`}><input value={n.etiqueta} onChange={e => escala({ niveles: m.escala.niveles.map(x => x.id === n.id ? { ...x, etiqueta: e.target.value } : x) })} /></Field>
        <Field label={`Significado del nivel ${i + 1}`}><input value={n.significado} onChange={e => escala({ niveles: m.escala.niveles.map(x => x.id === n.id ? { ...x, significado: e.target.value } : x) })} /></Field>
        {m.escala.tipo === 'numerica' && <Field label={`Valor numérico del nivel ${i + 1}`}><input type="number" step="any" value={n.valor ?? ''} onChange={e => escala({ niveles: m.escala.niveles.map(x => x.id === n.id ? { ...x, valor: e.target.value === '' ? undefined : Number(e.target.value) } : x) })} /></Field>}</div>
        <div className="hf-actions">{([-1, 1] as const).map(direction => <button key={direction} type="button" aria-label={`${direction === -1 ? 'Subir' : 'Bajar'} nivel ${i + 1}`} disabled={i + direction < 0 || i + direction >= m.escala.niveles.length} onClick={() => { const niveles = [...m.escala.niveles]; [niveles[i], niveles[i + direction]] = [niveles[i + direction], niveles[i]]; escala({ niveles }); }}>{direction === -1 ? '↑ Subir nivel' : '↓ Bajar nivel'}</button>)}<button type="button" onClick={() => escala({ niveles: m.escala.niveles.filter(x => x.id !== n.id) })}>Quitar nivel {i + 1}</button></div></fieldset>)}
      <button type="button" onClick={() => escala({ niveles: [...m.escala.niveles, { id: crypto.randomUUID(), etiqueta: '', significado: '' }] })}>Agregar nivel</button>
      {m.escala.tipo === 'numerica' && <Field label="Regla numérica explícita"><select value={m.escala.formula ?? ''} onChange={e => escala({ formula: e.target.value ? 'media_ponderada' : undefined })}><option value="">Sin índice</option><option value="media_ponderada">Media ponderada de valores numéricos</option></select></Field>}
      <p>Vista previa: {m.escala.niveles.map(n => `${n.etiqueta}${m.escala.tipo === 'numerica' ? ` (${n.valor ?? '?'})` : ''}: ${n.significado}`).join(' · ')}</p>
      <p>{m.escala.tipo === 'numerica' && m.escala.formula ? 'Índice = Σ(valor × peso) / Σ(pesos de criterios evaluados). No aplica queda fuera del denominador; denominador cero no produce índice.' : 'Se informa la distribución por nivel. Esta escala no calcula promedios.'}</p>
    </section>
    <section className="panel"><div className="panel-head"><h2>Expertos y lectores autorizados</h2></div><p>Selecciona entre 1 y 5 expertos elegibles. Cada experto trabaja de manera independiente. Los lectores reciben solo el consolidado.</p>
      <fieldset><legend>Expertos ({value.evaluadorIds.length}/5)</legend>{equipo.map(u => <label className="hf-check" key={u.id}><input type="checkbox" checked={value.evaluadorIds.includes(u.id)} disabled={!value.evaluadorIds.includes(u.id) && value.evaluadorIds.length >= 5} onChange={e => set({ evaluadorIds: e.target.checked ? [...value.evaluadorIds, u.id] : value.evaluadorIds.filter(id => id !== u.id) })} />{u.nombre} · {u.rol}</label>)}</fieldset>
      <fieldset><legend>Lectores autorizados</legend>{equipo.map(u => <label className="hf-check" key={u.id}><input type="checkbox" checked={value.lectorIds.includes(u.id)} onChange={e => set({ lectorIds: e.target.checked ? [...value.lectorIds, u.id] : value.lectorIds.filter(id => id !== u.id) })} />{u.nombre}</label>)}</fieldset>
    </section>
  </>;
}
