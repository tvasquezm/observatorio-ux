import type { ReactNode } from 'react';

interface TechniquePageHeaderProps {
  label: string;
  title: string;
  description: string;
  labelVariant?: 'eyebrow' | 'kicker';
  action?: ReactNode;
  /** Lista de pasos, o un nodo propio (p. ej. la guía de Card Sorting). Siempre arranca colapsado. */
  instructions?: string[] | ReactNode;
  /** Nota fija: no detecta cambios, solo recuerda actualizar la página para ver datos nuevos de otras personas. */
  avisoActualizar?: boolean;
}

export function TechniquePageHeader({
  label,
  title,
  description,
  labelVariant = 'eyebrow',
  action,
  instructions,
  avisoActualizar = true,
}: TechniquePageHeaderProps) {
  return (
    <><div className="page-head">
      <div>
        <span className={labelVariant}>{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {avisoActualizar && <p className="text-muted">Si otra persona del equipo cambia algo, actualiza la página para ver los datos nuevos.</p>}
      </div>
      {action}
    </div>
    {instructions && <details className="panel technique-instructions">
      <summary>Cómo trabajar con {title}</summary>
      {Array.isArray(instructions) && instructions.every(step => typeof step === 'string')
        ? <ol>{(instructions as string[]).map(step => <li key={step}>{step}</li>)}</ol>
        : instructions}
    </details>}</>
  );
}
