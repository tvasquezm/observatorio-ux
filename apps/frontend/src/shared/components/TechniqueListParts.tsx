import type { ReactNode } from 'react';

interface TechniqueListHeadProps {
  titulo: string;
  cantidad?: number;
  vista?: ReactNode;
}

/** Cabecera de la lista: título y contador a la izquierda, control de vista secundario a la derecha. */
export function TechniqueListHead({ titulo, cantidad, vista }: TechniqueListHeadProps) {
  return (
    <div className="technique-list-head">
      <div className="technique-list-title">
        <h3>{titulo}</h3>
        {cantidad !== undefined && <span className="short-id">{cantidad}</span>}
      </div>
      {vista && <div className="technique-list-view">{vista}</div>}
    </div>
  );
}

interface TechniqueEmptyProps {
  titulo: string;
  texto: string;
  icono?: ReactNode;
}

/** Estado vacío estándar: icono, título y una frase. */
export function TechniqueEmpty({ titulo, texto, icono }: TechniqueEmptyProps) {
  return (
    <div className="empty-state technique-empty">
      {icono}
      <strong>{titulo}</strong>
      <p>{texto}</p>
    </div>
  );
}
