import { useEffect, useId, useRef, useState } from 'react';
import { resumirCumplimiento, type EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { PdfContentPicker } from '../../shared/components/PdfContentPicker';

interface Props {
  informe: NonNullable<EvaluacionFlujo['informe']>;
  busy: boolean;
  error: string;
  onClose: () => void;
  onGenerate: (partes: string[]) => void;
}

export function InformePdfDialog({ informe, busy, error, onClose, onGenerate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { configuracion, consenso } = informe;
  const opciones = [
    { id: 'resumen', label: 'Resultado y participación' },
    { id: 'cumplimiento', label: 'Cumplimiento', disabled: !resumirCumplimiento(configuracion, consenso) },
    { id: 'criterios', label: 'Criterios' },
    { id: 'hallazgos', label: 'Hallazgos para mejorar', disabled: !consenso.hallazgos.some(h => h.decision === 'ACEPTADO') },
    { id: 'positivos', label: 'Lo que funciona bien', disabled: !consenso.positivos?.length },
    { id: 'mejoras', label: 'Antes y después', disabled: !consenso.mejoras?.length },
    { id: 'conclusion', label: 'Conclusión', disabled: !consenso.conclusion?.trim() },
  ];
  const disponibles = opciones.filter(opcion => !opcion.disabled).map(opcion => opcion.id);
  const [seleccion, setSeleccion] = useState(disponibles);
  const partes = disponibles.filter(id => seleccion.includes(id));

  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={ref} className="report-dialog" aria-labelledby={titleId} onCancel={event => {
      event.preventDefault();
      if (!busy) onClose();
    }}>
      <h2 id={titleId}>Exportar informe (PDF)</h2>
      <PdfContentPicker legend="Qué incluir" opciones={opciones} seleccion={partes} onChange={setSeleccion} disabled={busy} />
      {error && <p role="alert" className="report-error">{error}</p>}
      <div className="report-actions">
        <button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="button" className="primary" disabled={busy || !partes.length} onClick={() => onGenerate(partes)}>
          {busy ? 'Generando…' : 'Generar PDF'}
        </button>
      </div>
    </dialog>
  );
}
