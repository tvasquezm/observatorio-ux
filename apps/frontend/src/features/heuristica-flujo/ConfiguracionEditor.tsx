import { useState } from 'react';
import { copiarMetodologia, combinarMetodologias, escalaPredefinida, metodologiaVacia, problemasMetodologia } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EscalaFlujo, MetodologiaFlujo, MiembroEquipoFlujo } from '@observatorio-ux/shared-types';
import { useAuthStore } from '../auth/store/useAuthStore';
import { useConfirm } from '../../shared/api/confirm';
import { InfoTip } from '../../shared/components/ui/InfoTip';
import { Field, Fuente } from './campos';
import { claveDeNombre, faltantesParaIniciar } from './flujo-utils';
import { EscalaCriterio, EscalaRapida, PasoCabecera, PegarLista, VistaPreviaEvaluador } from './ConstructorMetodo';

export { Field, Fuente } from './campos';
export function ConfiguracionEditor({ value, onChange, biblioteca, equipo, onSaveMethod, onUpdateMethod, onDeleteMethod }: {
  value: ConfiguracionFlujo; onChange: (v: ConfiguracionFlujo) => void; biblioteca: MetodologiaFlujo[];
  equipo: MiembroEquipoFlujo[]; onSaveMethod: (m: MetodologiaFlujo) => Promise<void>;
  onUpdateMethod?: (m: MetodologiaFlujo) => Promise<void>; onDeleteMethod?: (id: string) => Promise<void>;
}) {
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [errorBiblioteca, setErrorBiblioteca] = useState('');
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const author = useAuthStore(s => s.user?.nombre ?? 'Autor de la evaluación');
  const set = (patch: Partial<ConfiguracionFlujo>) => onChange({ ...value, ...patch });
  const m = value.metodologia;
  const method = (patch: Partial<MetodologiaFlujo>) => set({ metodologia: { ...m, ...patch, protegida: false } });
  const escala = (patch: Partial<EscalaFlujo>) => method({ escala: { ...m.escala, ...patch } });
  const p = value.producto;
  const setProducto = (patch: Partial<ConfiguracionFlujo['producto']>) => set({ producto: { ...p, ...patch } });
  const faltan = faltantesParaIniciar(value);
  const [abiertos, setAbiertos] = useState<string[]>([]);
  const guardado = onUpdateMethod ? biblioteca.find(b => !b.protegida && b.id === m.id) : undefined;
  return <>
    <section className="panel">
      <div className="panel-head"><h2>Producto y alcance</h2></div>
      <Field label="Nombre de la evaluación"><input maxLength={160} value={value.nombre} onChange={e => set({ nombre: e.target.value })} /></Field>
      <div className="hf-grid">
        <Field label="Nombre del producto"><input maxLength={160} value={p.nombre} onChange={e => setProducto({ nombre: e.target.value, ...(!p.clave || p.clave === claveDeNombre(p.nombre) ? { clave: claveDeNombre(e.target.value) } : {}) })} /></Field>
        <Field label="URL del producto"><input maxLength={1000} value={p.url} onChange={e => setProducto({ url: e.target.value })} /></Field>
      </div>
      <Field label="Objetivo"><textarea maxLength={6000} value={value.objetivo} onChange={e => set({ objetivo: e.target.value })} /></Field>
      <details><summary>Más detalles</summary>
        <div className="hf-grid">{(['clave', 'version', 'dispositivo'] as const).map((k, i) => <Field key={k} label={['Identificador estable del producto', 'Versión del producto', 'Dispositivo / entorno'][i]}><input maxLength={160} value={p[k]} onChange={e => setProducto({ [k]: e.target.value })} /></Field>)}</div>
        <p className="hf-ayuda">El identificador se genera del nombre del producto; cámbialo solo si necesitas otro.</p>
        <div className="hf-grid">{(['tareas', 'pantallas', 'exclusiones'] as const).map((k, i) => <Field key={k} label={['Tareas a evaluar', 'Pantallas incluidas', 'Exclusiones'][i]}><textarea maxLength={6000} value={value[k]} onChange={e => set({ [k]: e.target.value })} /></Field>)}</div>
      </details>
      {faltan.length > 0 && <p role="status" className="hf-ayuda">Para iniciar falta: {faltan.join(', ')}.</p>}
    </section>
    <section className="panel">
      <PasoCabecera n={1} titulo="Partir de una metodología" ayuda="" />
      <InfoTip label="Ayuda sobre la biblioteca de metodologías" align="start">Copia una metodología existente, combina varias o empieza de cero. Los originales están protegidos: trabajas sobre una copia y cada criterio conserva su autor y fuente. WCAG y COGA orientan la revisión, sin certificar conformidad.</InfoTip>
      {biblioteca.map(original => <div key={original.id} className="hf-metodo">
        <div className="hf-actions"><strong>{original.nombre}</strong><span className="hf-ayuda">{original.protegida ? 'Original protegido' : 'Copia personal'}</span>
          <button type="button" className="secondary" aria-label={`Usar copia de ${original.nombre}`} onClick={() => set({ metodologia: copiarMetodologia(original) })}>Usar</button>
          {!original.protegida && onUpdateMethod && onDeleteMethod && <>
            <button type="button" className="secondary" aria-label={`Editar ${original.nombre}`} onClick={() => { setErrorBiblioteca(''); set({ metodologia: JSON.parse(JSON.stringify(original)) as MetodologiaFlujo }); }}>Editar</button>
            <button type="button" className="secondary" aria-label={`Borrar ${original.nombre}`} onClick={async () => {
              if (!(await confirm(`¿Borrar el método «${original.nombre}»? Las evaluaciones que ya lo usan no cambian.`))) return;
              setErrorBiblioteca('');
              try { await onDeleteMethod(original.id); } catch (e) { setErrorBiblioteca(e instanceof Error ? e.message : 'No se pudo borrar el método.'); }
            }}>Borrar</button></>}
        </div>
        <details><summary>Criterios y fuente</summary>
          <p>{original.autor} · {original.version} · {original.ambito}</p><Fuente value={original.fuente} />
          <ul>{original.criterios.map(c => <li key={c.id}>{c.nombre}: {c.descripcion}</li>)}</ul>
          {!original.protegida && onUpdateMethod && onDeleteMethod && <p className="hf-ayuda">Solo tú ves tus métodos. Editarlos o borrarlos no cambia las evaluaciones ya creadas.</p>}
        </details>
      </div>)}
      <div className="hf-actions"><button type="button" className="secondary" onClick={() => set({ metodologia: metodologiaVacia(author, crypto.randomUUID()) })}>Empezar de cero</button></div>
      {errorBiblioteca && <p role="alert" className="hf-error">{errorBiblioteca}</p>}
      <details><summary>Combinar varias</summary>
        {biblioteca.map(original => <label className="hf-check" key={original.id}><input type="checkbox" checked={seleccion.includes(original.id)} onChange={e => setSeleccion(e.target.checked ? [...seleccion, original.id] : seleccion.filter(id => id !== original.id))} />Combinar {original.nombre}</label>)}
        <div className="hf-actions"><button type="button" className="secondary" disabled={seleccion.length < 2} onClick={() => set({ metodologia: combinarMetodologias(biblioteca.filter(x => seleccion.includes(x.id))) })}>Combinar seleccionadas conservando origen</button></div>
      </details>
    </section>
    <section className="panel">
      <PasoCabecera n={2} titulo="Criterios de esta copia" ayuda="Escribe cada criterio, o pega una lista y se crean todos de una vez." />
      {guardado && <p role="status">✎ Estás editando tu método guardado «{guardado.nombre}». Al guardar se actualiza; las evaluaciones ya creadas no cambian.</p>}
      <Field label="Nombre de la metodología personalizada"><input maxLength={160} value={m.nombre} onChange={e => method({ nombre: e.target.value })} /></Field>
      <PegarLista metodologia={m} autor={author} onAdd={nuevos => method({ criterios: [...m.criterios, ...nuevos] })} />
      {m.criterios.map((c, index) => <details key={c.id} className="hf-criterio" open={abiertos.includes(c.id)} onToggle={e => { const abierto = e.currentTarget.open; setAbiertos(prev => abierto === prev.includes(c.id) ? prev : abierto ? [...prev, c.id] : prev.filter(id => id !== c.id)); }}><summary>{c.nombre || 'Criterio sin nombre'} · {c.categoria}</summary>
        <Field label={`Nombre del criterio ${index + 1}`}><input maxLength={300} value={c.nombre} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, nombre: e.target.value } : x) })} /></Field>
        <Field label={`Descripción del criterio ${index + 1}`}><textarea maxLength={6000} value={c.descripcion} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, descripcion: e.target.value } : x) })} /></Field>
        <div className="hf-grid"><Field label={`Categoría del criterio ${index + 1}`}><input value={c.categoria} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, categoria: e.target.value } : x) })} /></Field>
          <Field label={`Peso del criterio ${index + 1}`}><input type="number" min="0.001" step="any" value={c.peso} onChange={e => method({ criterios: m.criterios.map(x => x.id === c.id ? { ...x, peso: Number(e.target.value) } : x) })} /></Field></div>
        <EscalaCriterio criterio={c} index={index} onChange={escalaPropia => method({ criterios: m.criterios.map(x => { if (x.id !== c.id) return x; const { escala: _anterior, ...resto } = x; return escalaPropia ? { ...resto, escala: escalaPropia } : resto; }) })} />
        <p className="hf-origin">Origen: {c.origen.autor} · {c.origen.version} · <Fuente value={c.origen.fuente} /></p>
        <div className="hf-actions">{([-1, 1] as const).map(direction => <button key={direction} type="button" className="secondary" aria-label={`${direction === -1 ? 'Subir' : 'Bajar'} criterio ${index + 1}`} disabled={index + direction < 0 || index + direction >= m.criterios.length} onClick={() => { const criterios = [...m.criterios]; [criterios[index], criterios[index + direction]] = [criterios[index + direction], criterios[index]]; method({ criterios }); }}>{direction === -1 ? '↑ Subir' : '↓ Bajar'}</button>)}<button type="button" className="secondary" onClick={() => method({ criterios: m.criterios.filter(x => x.id !== c.id) })}>Quitar criterio {index + 1}</button></div>
      </details>)}
      <div className="hf-actions"><button type="button" className="secondary" onClick={() => { const id = crypto.randomUUID(); setAbiertos(prev => [...prev, id]); method({ criterios: [...m.criterios, { id, nombre: '', descripcion: '', categoria: 'Personalizado', peso: 1, origen: { metodologiaId: m.id, autor: author, fuente: `Definición propia de ${author}`, version: '1', tipo: 'personalizado' } }] }); }}>Agregar criterio</button>
        <button type="button" className="secondary" disabled={saving || problemasMetodologia(m).length > 0} onClick={async () => { setSaving(true); setError(''); try { await (guardado && onUpdateMethod ? onUpdateMethod(m) : onSaveMethod(m)); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la metodología'); } finally { setSaving(false); } }}>{guardado ? 'Guardar cambios del método' : 'Guardar metodología reutilizable'}</button></div>
      {error && <p role="alert" className="hf-error">{error}</p>}
    </section>
    <section className="panel"><PasoCabecera n={3} titulo="Escala de valoración" ayuda="Elige cómo se responde cada criterio. Puedes usar una sola escala para todo o una distinta por criterio (en el paso 2)." />
      <EscalaRapida onApply={clave => method({ escala: escalaPredefinida(clave), criterios: m.criterios.map(x => { const { escala: _propia, ...resto } = x; return resto; }) })} />
      <p role="status">Escala actual: {m.escala.niveles.map(n => `${n.etiqueta || '?'}${m.escala.tipo === 'numerica' ? ` (${n.valor ?? '?'})` : ''}`).join(' · ')} · {m.escala.tipo}{m.escala.tipo === 'numerica' && m.escala.formula ? ' · con índice' : ' · sin promedios'}</p>
      <details><summary>Personalizar escala</summary>
      <div className="hf-grid"><Field label="Tipo de escala"><select value={m.escala.tipo} onChange={e => escala({ tipo: e.target.value as EscalaFlujo['tipo'], formula: undefined })}>{['categorica', 'ordinal', 'numerica', 'cualitativa'].map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Sentido favorable"><select value={m.escala.sentido} onChange={e => escala({ sentido: e.target.value as EscalaFlujo['sentido'] })}><option value="mayor_mejor">Mayor es mejor</option><option value="menor_mejor">Menor es mejor</option><option value="sin_orden">Sin orden</option></select></Field></div>
      <Field label="Fuente o definición de la escala"><input value={m.escala.fuente} onChange={e => escala({ fuente: e.target.value })} /></Field>
      {m.escala.niveles.map((n, i) => <fieldset key={n.id}><legend>Nivel {i + 1}</legend><div className="hf-grid">
        <Field label={`Etiqueta del nivel ${i + 1}`}><input value={n.etiqueta} onChange={e => escala({ niveles: m.escala.niveles.map(x => x.id === n.id ? { ...x, etiqueta: e.target.value } : x) })} /></Field>
        <Field label={`Significado del nivel ${i + 1}`}><input value={n.significado} onChange={e => escala({ niveles: m.escala.niveles.map(x => x.id === n.id ? { ...x, significado: e.target.value } : x) })} /></Field>
        {m.escala.tipo === 'numerica' && <Field label={`Valor numérico del nivel ${i + 1}`}><input type="number" step="any" value={n.valor ?? ''} onChange={e => escala({ niveles: m.escala.niveles.map(x => x.id === n.id ? { ...x, valor: e.target.value === '' ? undefined : Number(e.target.value) } : x) })} /></Field>}</div>
        <div className="hf-actions">{([-1, 1] as const).map(direction => <button key={direction} type="button" className="secondary" aria-label={`${direction === -1 ? 'Subir' : 'Bajar'} nivel ${i + 1}`} disabled={i + direction < 0 || i + direction >= m.escala.niveles.length} onClick={() => { const niveles = [...m.escala.niveles]; [niveles[i], niveles[i + direction]] = [niveles[i + direction], niveles[i]]; escala({ niveles }); }}>{direction === -1 ? '↑ Subir nivel' : '↓ Bajar nivel'}</button>)}<button type="button" className="secondary" onClick={() => escala({ niveles: m.escala.niveles.filter(x => x.id !== n.id) })}>Quitar nivel {i + 1}</button></div></fieldset>)}
      <button type="button" className="secondary" onClick={() => escala({ niveles: [...m.escala.niveles, { id: crypto.randomUUID(), etiqueta: '', significado: '' }] })}>Agregar nivel</button>
      {m.escala.tipo === 'numerica' && <Field label="Regla numérica explícita"><select value={m.escala.formula ?? ''} onChange={e => escala({ formula: e.target.value ? 'media_ponderada' : undefined })}><option value="">Sin índice</option><option value="media_ponderada">Media ponderada de valores numéricos</option></select></Field>}
      </details>
      {m.escala.tipo === 'numerica' && m.escala.formula && <p className="hf-ayuda">Índice = Σ(valor × peso) / Σ(pesos de criterios evaluados). No aplica queda fuera del denominador; denominador cero no produce índice.</p>}
    </section>
    <section className="panel"><PasoCabecera n={4} titulo="Vista previa del evaluador" ayuda="Revisa cómo quedará el formulario antes de guardar." /><VistaPreviaEvaluador value={value} /></section>
    <section className="panel"><div className="panel-head"><h2>Equipo</h2></div><p className="hf-ayuda">Elige entre 1 y 5 expertos; cada uno trabaja de manera independiente. Los lectores reciben solo el consolidado.</p>
      <fieldset><legend>Equipo (expertos {value.evaluadorIds.length}/5)</legend>{equipo.map(u => <div className="hf-persona" key={u.id}><span>{u.nombre} · {u.rol}</span>
        <label className="hf-check"><input type="checkbox" aria-label={`Experto: ${u.nombre}`} checked={value.evaluadorIds.includes(u.id)} disabled={!value.evaluadorIds.includes(u.id) && value.evaluadorIds.length >= 5} onChange={e => set({ evaluadorIds: e.target.checked ? [...value.evaluadorIds, u.id] : value.evaluadorIds.filter(id => id !== u.id) })} />Experto</label>
        <label className="hf-check"><input type="checkbox" aria-label={`Lector: ${u.nombre}`} checked={value.lectorIds.includes(u.id)} onChange={e => set({ lectorIds: e.target.checked ? [...value.lectorIds, u.id] : value.lectorIds.filter(id => id !== u.id) })} />Lector</label></div>)}</fieldset>
    </section>
  </>;
}