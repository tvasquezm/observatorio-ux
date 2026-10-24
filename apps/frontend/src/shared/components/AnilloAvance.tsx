import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  hecho: number;
  total: number;
  etiqueta?: string;
  tamano?: number;
  className?: string;
}

export function AnilloAvance({ hecho, total, etiqueta, tamano = 56, className }: Props) {
  const gradienteId = `anillo-${useId().replace(/:/g, '')}`;
  const valor = total > 0 ? Math.max(0, Math.min(hecho, total)) : 0;
  const proporcion = total > 0 ? valor / total : 0;
  const completo = total > 0 && valor >= total;

  const eraCompleto = useRef(completo);
  const [recien, setRecien] = useState(false);
  useEffect(() => {
    if (completo && !eraCompleto.current) setRecien(true);
    if (!completo) setRecien(false);
    eraCompleto.current = completo;
  }, [completo]);

  const nombre = `${valor} de ${total}${etiqueta ? ` ${etiqueta}` : ''}${completo ? ', completo' : ''}`;
  const clases = ['tv-anillo', completo && 'tv-anillo--completo', recien && 'tv-anillo--recien', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={clases} role="img" aria-label={nombre} style={{ width: tamano, height: tamano }}>
      <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradienteId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--teal)' }} />
            <stop offset="1" style={{ stopColor: 'var(--mint)' }} />
          </linearGradient>
        </defs>
        <circle className="tv-anillo-pista" cx="24" cy="24" r="20" strokeWidth="5" />
        <circle
          className="tv-anillo-arco"
          cx="24"
          cy="24"
          r="20"
          strokeWidth="5"
          transform="rotate(-90 24 24)"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - proporcion}
          stroke={`url(#${gradienteId})`}
          style={{ opacity: proporcion > 0 ? 1 : 0 }}
        />
        {completo && <path className="tv-anillo-check" d="m15.5 24.5 6 6 11-12" pathLength={1} />}
      </svg>
      {!completo && tamano >= 40 && (
        <span className="tv-anillo-texto" aria-hidden="true" style={{ fontSize: Math.round(tamano * 0.27) }}>
          {valor}/{total}
        </span>
      )}
    </span>
  );
}
