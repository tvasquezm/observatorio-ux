import type { ReactNode } from 'react';

interface TechniquePageHeaderProps {
  label: string;
  title: string;
  description: string;
  labelVariant?: 'eyebrow' | 'kicker';
  action?: ReactNode;
  instructions?: string[];
  instructionsInitiallyOpen?: boolean;
}

export function TechniquePageHeader({
  label,
  title,
  description,
  labelVariant = 'eyebrow',
  action,
  instructions,
  instructionsInitiallyOpen = true,
}: TechniquePageHeaderProps) {
  return (
    <><div className="page-head">
      <div>
        <span className={labelVariant}>{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
    {instructions && <details className="panel technique-instructions" open={instructionsInitiallyOpen}>
      <summary>Cómo trabajar con {title}</summary>
      <ol>{instructions.map(step => <li key={step}>{step}</li>)}</ol>
    </details>}</>
  );
}
