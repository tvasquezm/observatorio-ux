import type { ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field">{label}{children}</label>; }
export function Fuente({ value }: { value: string }) { return /^https?:\/\//i.test(value) ? <a href={value} target="_blank" rel="noreferrer">{value}</a> : <span>{value}</span>; }
