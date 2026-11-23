export type FontSizePickerProps = {
  percent: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function FontSizePicker({ percent, canDecrease, canIncrease, onDecrease, onIncrease }: FontSizePickerProps) {
  return (
    <div className="font-size-picker" role="group" aria-label="Tamaño del texto">
      <span className="font-size-picker-label" aria-hidden="true">Tamaño del texto</span>
      <div className="font-size-picker-options">
        <button
          type="button"
          className="theme-toggle"
          data-size="down"
          aria-label="Reducir tamaño del texto"
          disabled={!canDecrease}
          onClick={onDecrease}
        >
          A−
        </button>
        <output className="font-size-picker-value" aria-live="polite">{percent} %</output>
        <button
          type="button"
          className="theme-toggle"
          data-size="up"
          aria-label="Aumentar tamaño del texto"
          disabled={!canIncrease}
          onClick={onIncrease}
        >
          A+
        </button>
      </div>
    </div>
  );
}
