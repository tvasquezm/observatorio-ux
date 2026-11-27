import { useEffect, useRef, useState } from 'react';
import { ganadorVotoRedactor, redactorDe } from '@observatorio-ux/shared-types';
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { flujoRequest } from './flujo.api';

interface Props { evaluacion: EvaluacionFlujo; usuarioId: string; nombreDe: (id: string) => string; guardar: () => Promise<void>; getRevision: () => number; onSaved: (e: EvaluacionFlujo) => void; /** Vuelve a pedir la evaluación al servidor (votos y redactor al día) sin recargar la página. */ onActualizar?: () => Promise<void> }

export function RedactorPanel({ evaluacion, usuarioId, nombreDe, guardar, getRevision, onSaved, onActualizar }: Props) {
  const { consenso, configuracion, coordinadorId } = evaluacion;
  const redactorId = redactorDe(consenso, coordinadorId);
  const votos = consenso.votosRedactor ?? {};
  const candidatos = [...new Set([coordinadorId, ...configuracion.evaluadorIds])];
  const hayMayoria = ganadorVotoRedactor(votos, configuracion.evaluadorIds) !== null;
  const esExperto = configuracion.evaluadorIds.includes(usuarioId);
  const quien = (id: string) => id === usuarioId ? 'tú' : nombreDe(id);
  /** Tras «por» el pronombre es «ti», no «tú». */
  const quienTrasPor = (id: string) => id === usuarioId ? 'ti' : nombreDe(id);
  const votaron = configuracion.evaluadorIds.filter(id => votos[id]);
  const faltanVotar = configuracion.evaluadorIds.filter(id => !votos[id]);
  const sinMayoria = !hayMayoria && faltanVotar.length === 0;
  const [actualizando, setActualizando] = useState(false);
  const [voto, setVoto] = useState(votos[usuarioId] ?? redactorId);
  const [decision, setDecision] = useState(redactorId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const previo = useRef(redactorId);
  useEffect(() => {
    if (previo.current === redactorId) return;
    previo.current = redactorId;
    setAviso(redactorId === usuarioId ? 'Cambió quien redacta el acuerdo: ahora redactas tú.' : `Cambió quien redacta el acuerdo: ahora redacta ${nombreDe(redactorId)}.`);
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
    <ul>{configuracion.evaluadorIds.map(id => <li key={id}>{nombreDe(id)}: {votos[id] ? `votó por ${quienTrasPor(votos[id])}` : 'aún no votó'}</li>)}</ul>
    {hayMayoria && <p role="status" className="hf-aviso"><strong>Votación cerrada:</strong> el equipo llegó a consenso y redacta {quien(redactorId)}. Ya no se puede votar.</p>}
    {!hayMayoria && faltanVotar.length > 0 && <p className="hf-ayuda">Faltan votos de: {faltanVotar.map(nombreDe).join(', ')}. {votaron.length} de {configuracion.evaluadorIds.length} ya votaron.</p>}
    {sinMayoria && <p role="alert" className="hf-aviso"><strong>No hay mayoría.</strong> {coordinadorId === usuarioId ? 'Elige tú a quien redacta (abajo) o pidan al equipo que vuelva a votar' : 'El coordinador debe elegir a alguien, o el equipo debe volver a votar'} hasta llegar a consenso.</p>}
    <div className="hf-actions"><button type="button" className="ghost" disabled={busy || actualizando || !onActualizar} onClick={async () => { setActualizando(true); setError(''); try { await onActualizar?.(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar los votos.'); } finally { setActualizando(false); } }}>{actualizando ? 'Actualizando…' : 'Actualizar votos'}</button></div>
    {esExperto && !hayMayoria && <div className="hf-actions"><label className="field">Mi voto<select value={voto} disabled={busy} onChange={e => setVoto(e.target.value)}>{opciones}</select></label>
      <button type="button" className="secondary" disabled={busy} onClick={() => void enviar('voto', { candidatoId: voto })}>Votar por este redactor</button></div>}
    {coordinadorId === usuarioId && (hayMayoria
      ? <p className="hf-ayuda">El equipo ya eligió por mayoría. El coordinador decide solo si hay empate o faltan votos.</p>
      : <div className="hf-actions"><label className="field">Redactor que decide el coordinador<select value={decision} disabled={busy} onChange={e => setDecision(e.target.value)}>{opciones}</select></label>
        <button type="button" className="secondary" disabled={busy} onClick={() => void enviar('decidir', { redactorId: decision })}>Decidir redactor</button></div>)}
    <p className="hf-ayuda">Gana quien tenga más de la mitad de los votos y en ese momento se cierra la votación. Sin mayoría, el coordinador elige a alguien o el equipo vuelve a votar (cada persona puede cambiar su voto) hasta llegar a consenso. Usa «Actualizar votos» para ver los votos de las demás personas.</p>
    {error && <p role="alert" className="hf-error">{error}</p>}
  </section>;
}
