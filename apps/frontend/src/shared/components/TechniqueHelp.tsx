import { useState } from 'react';
import { TECNICAS_INFO, type TecnicaId } from '../content/tecnicas-info';

export function TechniqueHelp({ tecnica }: { tecnica: TecnicaId }) {
  const info = TECNICAS_INFO[tecnica];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="technique-help">
    <details>
      <summary>Ver explicación completa</summary>
      <h4>{info.explicacionCompleta.titulo}</h4>
      {info.explicacionCompleta.secciones.map(s => <section key={s.encabezado}>
        <h5>{s.encabezado}</h5>
        {s.parrafos?.map(p => <p key={p}>{p}</p>)}
        {s.pasos && <ol>{s.pasos.map(p => <li key={p}>{p}</li>)}</ol>}
      </section>)}
    </details>
    <button type="button" className="secondary" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { const { descargarExplicacionPdf } = await import('../utils/tecnica-pdf'); await descargarExplicacionPdf(tecnica); }
      catch { setError('No pudimos descargar la explicación. Vuelve a intentarlo.'); }
      finally { setBusy(false); }
    }}>{busy ? 'Generando…' : 'Descargar explicación (PDF)'}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
