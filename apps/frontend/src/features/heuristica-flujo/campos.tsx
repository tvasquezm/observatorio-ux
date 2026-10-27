import type { ReactNode } from 'react';
import { esUrlSegura, normalizarUrlProducto } from '@observatorio-ux/shared-types';

export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field">{label}{children}</label>; }
export function Fuente({ value }: { value: string }) { const href = esUrlSegura(value) ? normalizarUrlProducto(value) : null; return href ? <a href={href} target="_blank" rel="noopener noreferrer">{value}</a> : <span>{value}</span>; }
