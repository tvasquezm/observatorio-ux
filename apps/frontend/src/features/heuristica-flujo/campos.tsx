import type { ReactNode } from 'react';
import { esUrlSegura, normalizarUrlProducto } from '@observatorio-ux/shared-types';
import { OptionalTag } from '../../shared/components/OptionalTag';

export function Field({ label, children, optional }: { label: string; children: ReactNode; optional?: boolean }) {
  return <label className="field">{label}{optional && <OptionalTag />}{children}</label>;
}
export function Fuente({ value }: { value: string }) { const href = esUrlSegura(value) ? normalizarUrlProducto(value) : null; return href ? <a href={href} target="_blank" rel="noopener noreferrer">{value}</a> : <span>{value}</span>; }
