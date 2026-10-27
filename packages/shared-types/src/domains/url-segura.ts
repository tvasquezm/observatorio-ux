export const URL_MAX_LARGO = 2000;

const ESQUEMA = /^([a-z][a-z0-9+.-]*):/i;
const PUERTO_TRAS_HOST = /^\d{1,5}(?:[/?#]|$)/;
const PROHIBIDOS = /[\u0000-\u0020\u007f\\<>"]/;
const ETIQUETA_HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * Normaliza una URL de producto escrita por una persona.
 * Solo http/https. Sin esquema antepone https://. Devuelve null si no es segura.
 * El valor vacio tambien devuelve null: quien llama decide si el campo es opcional.
 */
export function normalizarUrlProducto(entrada: string): string | null {
  if (typeof entrada !== 'string') return null;
  const texto = entrada.trim();
  if (!texto || texto.length > URL_MAX_LARGO) return null;
  if (texto.startsWith('//') || PROHIBIDOS.test(texto)) return null;

  let esquema = 'https';
  let resto = texto;
  const m = ESQUEMA.exec(texto);
  if (m && !PUERTO_TRAS_HOST.test(texto.slice(m[0].length))) {
    esquema = m[1].toLowerCase();
    if (esquema !== 'http' && esquema !== 'https') return null;
    if (!texto.startsWith('//', m[0].length)) return null;
    resto = texto.slice(m[0].length + 2);
  }

  const fin = resto.search(/[/?#]/);
  const autoridad = fin === -1 ? resto : resto.slice(0, fin);
  const sufijo = fin === -1 ? '' : resto.slice(fin);
  if (!autoridad || autoridad.includes('@')) return null;

  const dosPuntos = autoridad.lastIndexOf(':');
  const host = (dosPuntos === -1 ? autoridad : autoridad.slice(0, dosPuntos)).toLowerCase();
  const puerto = dosPuntos === -1 ? '' : autoridad.slice(dosPuntos + 1);
  if (dosPuntos !== -1 && (!/^\d{1,5}$/.test(puerto) || Number(puerto) > 65535)) return null;

  const etiquetas = host.split('.');
  if (!etiquetas.every(e => ETIQUETA_HOST.test(e))) return null;
  if (etiquetas.length < 2 && host !== 'localhost') return null;

  const resultado = `${esquema}://${host}${puerto ? `:${puerto}` : ''}${sufijo}`;
  return resultado.length > URL_MAX_LARGO ? null : resultado;
}

/** Verdadero solo si el valor trae http:// o https:// explicito y pasa la normalizacion. Para decidir un href. */
export function esUrlSegura(valor: string): boolean {
  return typeof valor === 'string' && /^https?:\/\//i.test(valor.trim()) && normalizarUrlProducto(valor) !== null;
}
