import { useEffect, useRef, useState } from 'react';
import type { VistaExportable } from '../card-sorting-export';
import type { OpcionesEstudioPdf } from '../card-sorting-pdf';

const DESCRIPCIONES: Record<VistaExportable, string> = {
  cards: 'Distribución de tarjetas, barras y tarjetas sin consenso.',
  categories: 'Tarjetas y porcentajes de cada categoría.',
  results: 'Matriz con cantidades de ubicaciones.',
  popular: 'Matriz con porcentajes por categoría.',
  similarity: 'Matriz de similitud entre pares de tarjetas.',
  dendrogram: 'Tabla de uniones sucesivas entre grupos.',
  participants: 'Clasificaciones anónimas de los participantes.',
  answers: 'Respuestas a las preguntas del card sorting.',
};

interface Props {
  tabs: Array<{ id: VistaExportable; label: string }>;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onGenerate: (vistas: VistaExportable[], opciones: OpcionesEstudioPdf) => void;
}

export function CardSortingPdfDialog({ tabs, busy, error, onClose, onGenerate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(() => tabs.map(t => t.id));
  const [resumen, setResumen] = useState(true);
  const [color, setColor] = useState(true);
  const [separarSecciones, setSeparar] = useState(true);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const contenido = [...(resumen ? ['Portada y resumen'] : []), ...tabs.filter(t => selected.includes(t.id)).map(t => t.label)];
  return <dialog ref={ref} className="report-dialog" aria-labelledby="cs-pdf-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <h2 id="cs-pdf-title">Exportar resultados (PDF)</h2>
    <fieldset disabled={busy}>
      <legend>Qué incluir</legend>
      <label className="pdf-section"><input type="checkbox" aria-label="Portada y resumen" checked={resumen} onChange={e => setResumen(e.target.checked)} />
        <span><strong>Portada y resumen</strong><small>Nombre, fecha e indicadores generales.</small></span></label>
      {tabs.map(t => <label key={t.id} className="pdf-section"><input type="checkbox" aria-label={t.label} checked={selected.includes(t.id)}
        onChange={e => setSelected(e.target.checked ? [...selected, t.id] : selected.filter(id => id !== t.id))} />
        <span><strong>{t.label}</strong><small>{DESCRIPCIONES[t.id]}</small></span></label>)}
    </fieldset>
    <fieldset disabled={busy}><legend>Presentación</legend>
      <label className="pdf-section"><input type="radio" name="cs-pdf-color" checked={color} onChange={() => setColor(true)} />Color</label>
      <label className="pdf-section"><input type="radio" name="cs-pdf-color" checked={!color} onChange={() => setColor(false)} />Blanco y negro</label>
      <label className="pdf-section"><input type="checkbox" checked={separarSecciones} onChange={e => setSeparar(e.target.checked)} />Salto de página entre secciones</label>
      <p>Las matrices apaisadas pueden necesitar una página nueva.</p>
    </fieldset>
    <p role="status">Tu PDF incluirá: {contenido.length ? contenido.join(', ') : 'ninguna sección. Elige al menos una.'}</p>
    {error && <p role="alert" className="error-text">{error}</p>}
    <div className="form-actions">
      <button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button>
      <button type="button" className="primary" disabled={busy || contenido.length === 0} onClick={() => onGenerate(tabs.filter(t => selected.includes(t.id)).map(t => t.id), { resumen, color, separarSecciones })}>
        {busy ? 'Generando…' : 'Generar PDF'}
      </button>
    </div>
  </dialog>;
}
