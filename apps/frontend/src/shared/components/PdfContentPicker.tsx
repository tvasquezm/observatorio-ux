import type { ReactNode } from 'react';

interface PdfContentPickerProps {
  legend: string;
  opciones: Array<{ id: string; label: string; descripcion?: string }>;
  seleccion: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  extra?: ReactNode;
}

export function PdfContentPicker({ legend, opciones, seleccion, onChange, disabled, extra }: PdfContentPickerProps) {
  return (
    <fieldset disabled={disabled}>
      <legend>{legend}</legend>
      {extra}
      {opciones.map(({ id, label, descripcion }) => (
        <label key={id} className="pdf-section">
          <input
            type="checkbox"
            aria-label={label}
            checked={seleccion.includes(id)}
            onChange={event => onChange(event.target.checked ? [...seleccion, id] : seleccion.filter(value => value !== id))}
          />
          <span><strong>{label}</strong>{descripcion && <small>{descripcion}</small>}</span>
        </label>
      ))}
    </fieldset>
  );
}
