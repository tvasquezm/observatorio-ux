import { useState } from 'react';
import type { AspectoPositivo, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { EvidenciaEditor } from './EvidenciaEditor';
import { Field } from './campos';
import { flujoRequest } from './flujo.api';
import { fechaChile } from './flujo-utils';

/**
 * Quien no redacta el acuerdo también puede agregar aspectos positivos. Se guardan aparte
 * (con autor y fecha) para no pisar el borrador de quien redacta, que los incorpora solo.
 */
export function AportePositivoEquipo({ evaluacion, usuarioId, nombreDe, onSaved }: { evaluacion: EvaluacionFlujo; usuarioId: string; nombreDe: (id: string) => string; onSaved: (e: EvaluacionFlujo) => void }) {
  const [borrador, setBorrador] = useState<AspectoPositivo | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const pendientes = evaluacion.consenso.aportesPositivos ?? [];
  const base = `/evaluaciones/${evaluacion.id}/consenso/aportes-positivos`;

  async function guardar() {
    if (!borrador) return;
    if (!borrador.titulo.trim()) { setError('Escribe un título para el aspecto positivo.'); return; }
    setBusy(true); setError('');
    try {
      onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, base, 'POST', { positivo: { id: borrador.id, titulo: borrador.titulo.trim(), descripcion: borrador.descripcion, evidenciaIds: borrador.evidenciaIds ?? [] } }));
      setAviso(`Agregaste «${borrador.titulo.trim()}». Quien redacta lo verá en el acuerdo.`);
      setBorrador(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo agregar el aspecto positivo.'); } finally { setBusy(false); }
  }

  async function quitar(id: string, titulo: string) {
    setBusy(true); setError('');
    try { onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `${base}/${encodeURIComponent(id)}`, 'DELETE')); setAviso(`Quitaste «${titulo}».`); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo quitar el aspecto positivo.'); } finally { setBusy(false); }
  }

  return <div className="hf-aporte-equipo">
    <p role="status" className="hf-aviso">{aviso}</p>
    {pendientes.length > 0 && <>
      <h3>Aspectos positivos agregados por el equipo, aún sin incorporar</h3>
      <ul className="hf-aportes">{pendientes.map(a => <li key={a.id} className="hf-form-resumen">
        <div><h4>{a.titulo}</h4><p className="hf-form-meta">Agregado por {a.autorId ? nombreDe(a.autorId) : 'el equipo'}{a.creadoEn ? ` · ${fechaChile(a.creadoEn)}` : ''}{a.evidenciaIds?.length ? ` · ${a.evidenciaIds.length} captura${a.evidenciaIds.length === 1 ? '' : 's'}` : ''}</p></div>
        {a.autorId === usuarioId && <button type="button" className="link-btn link-btn--delete" disabled={busy} onClick={() => void quitar(a.id, a.titulo)}>Quitar <span className="sr-only">{a.titulo}</span></button>}
      </li>)}</ul>
    </>}
    {borrador ? <fieldset disabled={busy} className="hf-form-card"><legend>Nuevo aspecto positivo</legend>
      <Field label="Título del aspecto positivo"><input maxLength={300} value={borrador.titulo} placeholder="Por ejemplo: el menú usa palabras que la gente entiende" onChange={e => setBorrador({ ...borrador, titulo: e.target.value })} /></Field>
      <Field label="Descripción del aspecto positivo"><textarea maxLength={10000} rows={3} value={borrador.descripcion} onChange={e => setBorrador({ ...borrador, descripcion: e.target.value })} /></Field>
      <div className="hf-form-evidencia">
        <h4>Capturas <small>(opcional, hasta 10)</small></h4>
        <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={borrador.evidenciaIds ?? []} editable={!busy} max={10} etiqueta="del aspecto positivo"
          onChange={ids => setBorrador(prev => prev && { ...prev, evidenciaIds: ids })} onPendingChange={setSubiendo} />
      </div>
      {error && <p role="alert" className="hf-error">{error}</p>}
      <div className="hf-form-acciones">
        <button type="button" className="ghost" disabled={busy} onClick={() => { setBorrador(null); setError(''); }}>Cancelar</button>
        <button type="button" className="primary" disabled={busy || subiendo} onClick={() => void guardar()}>Guardar aspecto positivo</button>
      </div>
    </fieldset>
      : <>
        {error && <p role="alert" className="hf-error">{error}</p>}
        <button type="button" className="secondary hf-form-agregar" disabled={busy} onClick={() => { setAviso(''); setBorrador({ id: crypto.randomUUID(), titulo: '', descripcion: '', evidenciaIds: [] }); }}>Agregar aspecto positivo</button>
      </>}
  </div>;
}
