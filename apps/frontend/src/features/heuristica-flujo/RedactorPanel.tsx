import { useEffect, useRef, useState } from 'react';
import { ganadorVotoRedactor, redactorDe } from '@observatorio-ux/shared-types';
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { flujoRequest } from './flujo.api';

interface Props { evaluacion: EvaluacionFlujo; usuarioId: string; nombreDe: (id: string) => string; guardar: () => Promise<void>; getRevision: () => number; onSaved: (e: EvaluacionFlujo) => void }

export function RedactorPanel({ evaluacion, usuarioId, nombreDe, guardar, getRevision, onSaved }: Props) {
  const { consenso, configuracion, coordinadorId } = evaluacion;
  const redactorId = redactorDe(consenso, coordinadorId);
  const votos = consenso.votosRedactor ?? {};
  const candidatos = [...new Set([coordinadorId, ...configuracion.evaluadorIds])];
  const hayMayoria = ganadorVotoRedactor(votos, configuracion.evaluadorIds) !== null;
  const esExperto = configuracion.evaluadorIds.includes(usuarioId);
  const quien = (id: string) => id === usuarioId ? 'tú' : nombreDe(id);
  const [voto, setVoto] = useState(votos[usuarioId] ?? redactorId);
  const [decision, setDecision] = useState(redactorId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const previo = useRef(redactorId);
  useEffect(() => {
    if (previo.current === redactorId) return;
    previo.current = redactorId;
    setAviso(`Cambió quien redacta el acuerdo: ahora redacta ${quien(redactorId)}.`);
  }, [redactorId]);
  async function enviar(ruta: 'voto' | 'decidir', cuerpo: { candidatoId: string } | { redactorId: string }) {
    setBusy(true); setError('');
    try { await guardar(); onSaved(await flujoRequest<EvaluacionFlujo>(evaluacion.proyectoId, `/evaluaciones/${evaluacion.id}/redactor/${ruta}`, 'POST', { revision: getRevision(), ...cuerpo })); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar la elección.'); } finally { setBusy(false); }
  }
  const opciones = candidatos.map(id => <option key={id} value={id}>{nombreDe(id)}</option>);
  return <section className="panel hf-redactor" aria-label="Quién redacta el acuerdo">
    <div className="panel-head"><h2>Quién redacta el acuerdo</h2></div>
    {aviso && <p role="status" className="hf-aviso">{aviso}</p>}
    <p>Redactor actual: {quien(redactorId)} ({consenso.redactorId ? 'elegido por el equipo' : 'el coordinador, hasta que el equipo vote'}).</p>
    <ul>{configuracion.evaluadorIds.map(id => <li key={id}>{nombreDe(id)}: {votos[id] ? `votó por ${quien(votos[id])}` : 'aún no votó'}</li>)}</ul>
    {esExperto && <div className="hf-actions"><label className="field">Mi voto<select value={voto} disabled={busy} onChange={e => setVoto(e.target.value)}>{opciones}</select></label>
      <button type="button" className="secondary" disabled={busy} onClick={() => void enviar('voto', { candidatoId: voto })}>Votar por este redactor</button></div>}
    {coordinadorId === usuarioId && (hayMayoria
      ? <p className="hf-ayuda">El equipo ya eligió por mayoría. El coordinador decide solo si hay empate o faltan votos.</p>
      : <div className="hf-actions"><label className="field">Redactor que decide el coordinador<select value={decision} disabled={busy} onChange={e => setDecision(e.target.value)}>{opciones}</select></label>
        <button type="button" className="secondary" disabled={busy} onClick={() => void enviar('decidir', { redactorId: decision })}>Decidir redactor</button></div>)}
    <p className="hf-ayuda">Gana quien tenga más de la mitad de los votos. Con empate o votos faltantes decide el coordinador. Para cambiar de redactor, voten de nuevo; el cambio se muestra a todos al actualizar.</p>
    {error && <p role="alert" className="hf-error">{error}</p>}
  </section>;
}
