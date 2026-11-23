import { useRef } from 'react';
import { PdfContentPicker } from '../../shared/components/PdfContentPicker';

interface Opcion { id: string; label: string; descripcion?: string; disabled?: boolean }
interface LienzoOpcion { id: string; nombre: string }

/** "Todo · 3 de 3 apartados", "2 de 3 apartados" o "Ninguno". */
export function resumenApartados(elegidos: number, total: number): string {
  if (!elegidos) return 'Ninguno';
  return elegidos === total ? `Todo · ${total} de ${total} apartados` : `${elegidos} de ${total} apartados`;
}

/**
 * F39: una fila por técnica. La casilla la incluye o excluye; el botón despliega
 * sus apartados y "Listo" los pliega dejando el resumen a la vista.
 */
export function TecnicaAcordeon({ id, label, detail, opciones, incluida, abierta, partes, onIncluir, onAbrir, onPartes, lienzos = [], lienzosElegidos, onLienzos }: {
  id: string; label: string; detail: string; opciones: readonly Opcion[];
  incluida: boolean; abierta: boolean; partes: string[];
  onIncluir: (incluir: boolean) => void; onAbrir: (abrir: boolean) => void; onPartes: (ids: string[]) => void;
  /** Lienzos de la técnica en el proyecto (varias personas, varios mapas…); sin elegir = todos. */
  lienzos?: readonly LienzoOpcion[]; lienzosElegidos?: string[]; onLienzos?: (ids: string[]) => void;
}) {
  const elegidos = lienzosElegidos ?? lienzos.map(l => l.id);
  const resumenLienzos = lienzos.length > 1 ? `${elegidos.length} de ${lienzos.length} · ` : '';
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = `tecnica-${id}-apartados`;
  return (
    <div className="report-tecnica" data-abierta={abierta || undefined}>
      <div className="report-option">
        <input type="checkbox" aria-label={`Incluir ${label}`} checked={incluida} onChange={(event) => onIncluir(event.target.checked)} />
        <span><strong>{label}</strong><small>{detail}</small></span>
        <span className="report-tecnica-resumen" aria-live="polite">{incluida ? resumenLienzos + resumenApartados(partes.length, opciones.length) : 'No se incluye'}</span>
        <button ref={toggle} type="button" className="ghost report-tecnica-toggle" aria-expanded={abierta} aria-controls={panelId} disabled={!incluida} onClick={() => onAbrir(!abierta)}>
          {abierta ? 'Plegar' : 'Elegir apartados'}{' '}<span className="sr-only">de {label}</span>
        </button>
      </div>
      {incluida && abierta && <div id={panelId} className="report-tecnica-panel">
        {lienzos.length > 1 && onLienzos && <PdfContentPicker compacto legend={`Cuáles de ${label}`} opciones={lienzos.map(l => ({ id: l.id, label: l.nombre }))} seleccion={elegidos} onChange={onLienzos} />}
        <PdfContentPicker compacto legend={`Qué incluir de ${label}`} opciones={opciones} seleccion={partes} onChange={onPartes} />
        <button type="button" className="ghost" onClick={() => { onAbrir(false); toggle.current?.focus(); }}>Listo<span className="sr-only">: apartados de {label}</span></button>
      </div>}
    </div>
  );
}
