import { Icon } from '../../../shared/components/ui/Icon';
import { normalizarTexto, type AnalisisEntrada } from '../card-sorting-input';

interface ChipsProps {
  info: AnalisisEntrada;
  max: number;
  aviso?: number;
  noun: string;
  onRemove: (index: number) => void;
}

export function CardSortingChips({ info, max, aviso, noun, onRemove }: ChipsProps) {
  if (info.items.length === 0) return null;
  const repetidas = new Set(info.duplicados.map(normalizarTexto));
  return (
    <ul className="cs-chips" aria-label={`Lista de ${noun}`}>
      {info.items.map((item, index) => {
        const estado = item.length > max
          ? 'error'
          : repetidas.has(normalizarTexto(item))
            ? 'error'
            : aviso !== undefined && item.length >= aviso
              ? 'warn'
              : '';
        return (
          <li key={`${index}-${item}`} className={`cs-chip${estado ? ` ${estado}` : ''}`}>
            <span>{item}</span>
            <button type="button" aria-label={`Quitar ${item}`} onClick={() => onRemove(index)}>
              <Icon name="close" size={12} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
