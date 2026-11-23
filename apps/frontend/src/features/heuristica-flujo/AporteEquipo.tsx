import { useState } from 'react';
import type { EvaluacionFlujo, HallazgoFlujo } from '@observatorio-ux/shared-types';
import { EvidenciaEditor } from './EvidenciaEditor';
import { HallazgoEditor } from './TrabajoEditor';
import { flujoRequest } from './flujo.api';
import { fechaChile, hallazgoVacio } from './flujo-utils';

/**
 * F31: quien no redacta el acuerdo agrega problemas desde aquí. Se guardan aparte
 * (con autor y fecha) para no pisar el borrador de quien redacta, que luego los
 * decide como cualquier problema de origen.
 */
export function AporteEquipo({ evaluacion, usuarioId, nombreDe, onSaved }: { evaluacion: EvaluacionFlujo; usuarioId: string; nombreDe: (id: string) => string; onSaved: (e: EvaluacionFlujo) => void }) {
  const [borrador, setBorrador] = useState<HallazgoFlujo | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const incluidos = new Set(evaluacion.consenso.hallazgos.flatMap(h => h.origenIds));
  const pendientes = (evaluacion.consenso.aportes ?? []).filter(a => !incluidos.has(a.id));
  const base = `/evaluaciones/${evaluacion.id}/consenso/aportes`;

  async function guardar() {
    if (!borrador) return;
    const campos = [!borrador.titulo.trim() && 'título', !borrador.descripcion.trim() && 'descripción', !borrador.criterioIds.length && 'pregunta relacionada'].filter(Boolean);
    if (campos.length) { setError(`Completa ${campos.join(' y ')}.`); return; }
    setBusy(true); setError('');
    try {
      onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, base, 'POST', { hallazgo: borrador }));
      setAviso(`Agregaste «${borrador.titulo.trim()}». Quien redacta decidirá si entra al informe.`);
      setBorrador(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo agregar el problema.'); } finally { setBusy(false); }
  }

  async function quitar(id: string, titulo: string) {
    setBusy(true); setError('');
    try { onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `${base}/${encodeURIComponent(id)}`, 'DELETE')); setAviso(`Quitaste «${titulo}».`); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo quitar el problema.'); } finally { setBusy(false); }
  }

  return <div className="hf-aporte-equipo">
    <p role="status" className="hf-aviso">{aviso}</p>
    {pendientes.length > 0 && <>
      <h3>Agregados por el equipo, sin decidir todavía</h3>
      <ul className="hf-aportes">{pendientes.map(a => <li key={a.id} className="hf-form-resumen">
        <div><h4>{a.titulo}</h4><p className="hf-form-meta">Agregado por {nombreDe(a.autorId)} · {fechaChile(a.creadoEn)}{a.evidenciaIds.length ? ` · ${a.evidenciaIds.length} captura${a.evidenciaIds.length === 1 ? '' : 's'}` : ''}</p></div>
        {a.autorId === usuarioId && <button type="button" className="link-btn link-btn--delete" disabled={busy} onClick={() => void quitar(a.id, a.titulo)}>Quitar <span className="sr-only">{a.titulo}</span></button>}
      </li>)}</ul>
    </>}
    {borrador ? <fieldset disabled={busy} className="hf-form-card"><legend>Nuevo problema</legend>
      <HallazgoEditor value={borrador} config={evaluacion.configuracion} onChange={setBorrador} />
      <div className="hf-form-evidencia">
        <h4>Capturas <small>(opcional)</small></h4>
        <EvidenciaEditor proyectoId={evaluacion.proyectoId} evaluacionId={evaluacion.id} evidenciaIds={borrador.evidenciaIds} editable={!busy} onChange={ids => setBorrador(prev => prev && { ...prev, evidenciaIds: ids })} onPendingChange={setSubiendo} />
      </div>
      {error && <p role="alert" className="hf-error">{error}</p>}
      <div className="hf-form-acciones">
        <button type="button" className="ghost" disabled={busy} onClick={() => { setBorrador(null); setError(''); }}>Cancelar</button>
        <button type="button" className="primary" disabled={busy || subiendo} onClick={() => void guardar()}>Guardar problema</button>
      </div>
    </fieldset>
      : <>
        {error && <p role="alert" className="hf-error">{error}</p>}
        <button type="button" className="secondary hf-form-agregar" disabled={busy} onClick={() => { setAviso(''); setBorrador(hallazgoVacio(evaluacion.configuracion.metodologia.criterios[0].id)); }}>Agregar problema</button>
      </>}
  </div>;
}
