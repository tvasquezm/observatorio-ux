import type { ReactNode } from 'react';

interface TechniquePageHeaderProps {
  label: string;
  title: string;
  description: string;
  labelVariant?: 'eyebrow' | 'kicker';
  action?: ReactNode;
}

export function TechniquePageHeader({
  label,
  title,
  description,
  labelVariant = 'eyebrow',
  action,
}: TechniquePageHeaderProps) {
  return (
    <div className="page-head">
      <div>
        <span className={labelVariant}>{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
