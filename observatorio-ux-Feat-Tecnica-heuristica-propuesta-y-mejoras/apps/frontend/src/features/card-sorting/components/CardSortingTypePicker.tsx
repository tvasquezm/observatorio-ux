import type { TipoCardSorting } from '../api/card-sorting.api';

const OPTIONS: Array<{ value: TipoCardSorting; title: string; desc: string }> = [
  { value: 'ABIERTO', title: 'Abierto', desc: 'Cada participante crea sus categorías' },
  { value: 'CERRADO', title: 'Cerrado', desc: 'Usa las categorías que defines tú' },
  { value: 'HIBRIDO', title: 'Híbrido', desc: 'Las tuyas más categorías propias' },
];

interface Props {
  value: TipoCardSorting;
  onChange: (value: TipoCardSorting) => void;
}

export function CardSortingTypePicker({ value, onChange }: Props) {
  return (
    <fieldset className="cs-type-picker">
      <legend>Tipo de estudio</legend>
      <div className="cs-type-options">
        {OPTIONS.map((option) => (
          <label key={option.value} className={`cs-type-option${value === option.value ? ' selected' : ''}`}>
            <input
              type="radio"
              name="tipo-card-sorting"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <strong>{option.title}</strong>
            <span>{option.desc}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
