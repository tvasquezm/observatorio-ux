// apps/frontend/src/shared/components/ui/CampoUrl.tsx
//
// Campo de dirección web con el esquema (https://) fijo en un recuadro pequeño a la
// izquierda: la persona solo escribe, por ejemplo, www.utem.cl. El valor que sale
// (onChange) y el que entra (value) es siempre la URL completa, igual que antes,
// así que el resto de la app y las validaciones del servidor no cambian.

import type { InputHTMLAttributes, ReactElement } from 'react';

const ESQUEMA = /^(https?):\/\//i;

/** Separa el esquema del resto de la dirección. Sin esquema se asume https. */
export function partesUrl(valor: string): { esquema: 'http://' | 'https://'; resto: string } {
  const limpio = valor.trim();
  const m = ESQUEMA.exec(limpio);
  return { esquema: m && m[1].toLowerCase() === 'http' ? 'http://' : 'https://', resto: limpio.replace(ESQUEMA, '') };
}

/** URL completa a guardar a partir de lo escrito (vacío si no hay nada). Si se pega una URL con esquema, se respeta. */
export function urlCompleta(texto: string, esquema: 'http://' | 'https://' = 'https://'): string {
  const t = texto.trim();
  if (!t) return '';
  return ESQUEMA.test(t) ? t : `${esquema}${t}`;
}

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** URL completa (con esquema) o vacío. */
  value: string;
  onChange: (urlCompleta: string) => void;
}

export function CampoUrl({ value, onChange, placeholder = 'www.utem.cl', ...resto }: Props): ReactElement {
  const { esquema, resto: texto } = partesUrl(value);
  return (
    <span className="campo-url">
      <span className="campo-url__prefijo" aria-hidden="true">{esquema}</span>
      <input
        {...resto}
        type="text"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={placeholder}
        value={texto}
        onChange={(e) => onChange(urlCompleta(e.target.value, esquema))}
      />
    </span>
  );
}
