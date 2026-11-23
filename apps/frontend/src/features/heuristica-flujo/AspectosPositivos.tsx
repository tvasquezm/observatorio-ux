import { useState } from 'react';
import type { AspectoPositivo, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { EvidenciaEditor } from './EvidenciaEditor';
import { Field } from './campos';

/**
 * Lo que funciona bien en el producto: cada aspecto es una tarjeta con título, descripción
 * y capturas (con anotaciones), igual que un problema. Guardado, se pliega a un resumen.
 */
export function AspectosPositivos({ evaluacion, positivos, bloqueo, onChange, onPendingChange }: {
  evaluacion: EvaluacionFlujo; positivos: AspectoPositivo[]; bloqueo: boolean;
  onChange: (positivos: AspectoPositivo[]) => void; onPendingChange: (id: string, subiendo: boolean) => void;
}) {
  const [plegados, setPlegados] = useState<ReadonlySet<string>>(() => new Set(positivos.filter(p => p.titulo.trim()).map(p => p.id)));
  const [sinTitulo, setSinTitulo] = useState<string | null>(null);
  const cambiar = (id: string, patch: Partial<AspectoPositivo>) => onChange(positivos.map(x => x.id === id ? { ...x, ...patch } : x));
  const quitar = (id: string) => { onChange(positivos.filter(x => x.id !== id)); onPendingChange(id, false); };
  const plegar = (id: string, si: boolean) => setPlegados(prev => { const n = new Set(prev); if (si) n.add(id); else n.delete(id); return n; });

  return <fieldset disabled={bloqueo} className="hf-form-lista">
    <legend className="sr-only">Lo que funciona bien en el producto</legend>
    {positivos.map((p, i) => {
      const n = i + 1;
      const capturas = p.evidenciaIds?.length ?? 0;
      if (plegados.has(p.id)) return <article key={p.id} className="hf-form-resumen" aria-label={`Aspecto positivo ${n}: ${p.titulo}`}>
        <div>
          <h4>{p.titulo}</h4>
          {p.descripcion && <p>{p.descripcion}</p>}
          <p className="hf-form-meta" role="status">Aspecto positivo guardado con éxito{capturas ? ` · ${capturas} captura${capturas === 1 ? '' : 's'}` : ''}</p>
        </div>
        <div className="hf-form-resumen-acciones">
          <button type="button" className="ghost" onClick={() => plegar(p.id, false)}>Editar aspecto positivo {n}</button>
          <button type="button" className="link-btn link-btn--delete" onClick={() => quitar(p.id)}>Quitar aspecto positivo {n}</button>
        </div>
      </article>;
      return <fieldset key={p.id} className="hf-form-card">
        <legend>Aspecto positivo {n}: {p.titulo || 'Sin título'}</legend>
        <Field label={`Título del aspecto positivo ${n}`}><input maxLength={300} value={p.titulo} placeholder="Por ejemplo: el menú usa palabras que la gente entiende" onChange={e => cambiar(p.id, { titulo: e.target.value })} /></Field>
        <Field label={`Descripción del aspecto positivo ${n}`}><textarea maxLength={10000} rows={3} value={p.descripcion} placeholder="Qué se observó y por qué ayuda a la persona usuaria." onChange={e => cambiar(p.id, { descripcion: e.target.value })} /></Field>
        <div className="hf-form-evidencia">
          <h4>Capturas <small>(opcional, hasta 10)</small></h4>
          <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={p.evidenciaIds ?? []} editable={!bloqueo} max={10}
            etiqueta={`del aspecto positivo ${n}`} onChange={ids => cambiar(p.id, { evidenciaIds: ids })} onPendingChange={v => onPendingChange(p.id, v)} />
        </div>
        {sinTitulo === p.id && !p.titulo.trim() && <p role="alert" className="hf-error">Escribe un título para guardar el aspecto positivo.</p>}
        <div className="hf-form-acciones">
          <button type="button" className="link-btn link-btn--delete" onClick={() => quitar(p.id)}>Quitar aspecto positivo {n}</button>
          <button type="button" className="primary" onClick={() => { if (!p.titulo.trim()) { setSinTitulo(p.id); return; } setSinTitulo(null); plegar(p.id, true); }}>Guardar aspecto positivo {n}</button>
        </div>
      </fieldset>;
    })}
    <button type="button" className="secondary hf-form-agregar" disabled={positivos.length >= 200} onClick={() => onChange([...positivos, { id: crypto.randomUUID(), titulo: '', descripcion: '', evidenciaIds: [] }])}>Agregar aspecto positivo</button>
  </fieldset>;
}
