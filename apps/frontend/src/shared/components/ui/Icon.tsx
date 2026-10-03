// apps/frontend/src/shared/components/ui/Icon.tsx
//
// Set de íconos SVG propios (trazo 1.8, 24x24, currentColor). Reemplaza los
// glifos Unicode que antes se usaban como íconos. Decorativo por defecto
// (aria-hidden); con `title` expone el nombre accesible.

import type { ReactElement } from 'react';

export type IconName =
  | 'dashboard'
  | 'proyectos'
  | 'salas'
  | 'admin'
  | 'personas'
  | 'journey'
  | 'momentos'
  | 'card-sorting'
  | 'heuristica'
  | 'search';

const PATHS: Record<IconName, ReactElement> = {
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  proyectos: (
    <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
  ),
  salas: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.4-3.4 2.4-5.2 5.5-5.2s5.1 1.8 5.5 5.2" />
      <circle cx="17" cy="9.5" r="2.25" />
      <path d="M16.5 14c2.5 0 3.7 1.5 4 4" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  personas: (
    <>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19c.45-3.75 2.6-5.75 6.5-5.75s6.05 2 6.5 5.75" />
    </>
  ),
  journey: (
    <>
      <circle cx="5.5" cy="17.5" r="1.8" />
      <circle cx="18.5" cy="5.5" r="1.8" />
      <path d="M7.3 17.5H13a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h5.7" />
    </>
  ),
  momentos: (
    <>
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4.2" />
      <path d="M12 16.8v.1" />
    </>
  ),
  'card-sorting': (
    <>
      <rect x="4" y="4" width="6.5" height="8" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="5" rx="1.5" />
      <rect x="4" y="15" width="6.5" height="5" rx="1.5" />
      <rect x="13.5" y="12" width="6.5" height="8" rx="1.5" />
    </>
  ),
  heuristica: (
    <>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5" />
      <path d="m9.2 13 2 2 3.8-4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  title?: string;
}

export function Icon({ name, size = 18, title }: IconProps): ReactElement {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
