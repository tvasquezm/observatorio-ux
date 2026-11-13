import type { CSSProperties } from 'react';

export function SalaBadge({ id, nombre }: { id: string; nombre: string }) {
  const color = Array.from(id).reduce((hash, char) => (hash * 31 + char.codePointAt(0)!) >>> 0, 0) % 8 + 1;
  return <span className="sala-badge" aria-hidden="true" style={{ '--room-color': `var(--room-${color})` } as CSSProperties}>
    {Array.from(nombre.trim())[0]?.toLocaleUpperCase('es') ?? 'S'}
  </span>;
}
