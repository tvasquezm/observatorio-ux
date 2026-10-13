import { severidadInfo } from '../heuristica-utils';

/** La etiqueta de texto siempre acompaña al color: la severidad no depende solo del color. */
export function SeveridadBadge({ valor }: { valor: number }) {
  const info = severidadInfo(valor);
  return (
    <span className={`badge hx-sev hx-sev-${info.valor}`}>
      {info.valor} · {info.etiqueta}
    </span>
  );
}
