import type { ReactNode } from 'react';

interface TechniquePageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function TechniquePageHeader({
  title,
  description,
  action,
}: TechniquePageHeaderProps) {
  return (
    <div className="page-head">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
