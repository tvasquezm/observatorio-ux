// Límites acordados para tarjetas y categorías. El backend aplica los mismos
// (card-sorting.dto.ts); aquí solo se usan para avisar antes de enviar.
export const MAX_ETIQUETA = 100;
export const AVISO_ETIQUETA = 80;
export const MAX_CATEGORIA = 60;
export const MAX_TARJETAS = 100;
export const MIN_RECOMENDADAS = 30;
export const MAX_RECOMENDADAS = 60;
export const MIN_CATEGORIAS_CERRADO = 2;
export const MAX_PREGUNTAS = 5;
export const MAX_PREGUNTA = 300;
export const MAX_RESPUESTA = 1000;

// Misma normalización que el backend: sin tildes ni mayúsculas.
export function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL');
}

export interface AnalisisEntrada {
  items: string[];
  duplicados: string[];
  largas: string[];
  excedidas: string[];
}

// Una línea = un elemento. Descarta vacías, detecta duplicados normalizados,
// marca las de `aviso` caracteres o más y las que superan `max`.
export function analizarEntrada(texto: string, max: number, aviso = max): AnalisisEntrada {
  const items = texto
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);
  const vistos = new Set<string>();
  const duplicados: string[] = [];
  for (const item of items) {
    const clave = normalizarTexto(item);
    if (vistos.has(clave)) {
      if (!duplicados.some((d) => normalizarTexto(d) === clave)) duplicados.push(item);
    } else {
      vistos.add(clave);
    }
  }
  return {
    items,
    duplicados,
    largas: items.filter((item) => item.length >= aviso && item.length <= max),
    excedidas: items.filter((item) => item.length > max),
  };
}

// Agrega un elemento como línea nueva al final del texto.
export function agregarLinea(texto: string, valor: string): string {
  const limpio = valor.trim();
  if (!limpio) return texto;
  const base = texto.replace(/\s+$/, '');
  return base ? `${base}\n${limpio}` : limpio;
}

// Quita el n-ésimo elemento no vacío (el mismo índice que `analizarEntrada().items`).
export function quitarElemento(texto: string, indice: number): string {
  let visto = -1;
  return texto
    .split('\n')
    .filter((linea) => {
      if (!linea.trim()) return true;
      visto += 1;
      return visto !== indice;
    })
    .join('\n');
}

export type EstadoCantidad = 'bajo' | 'ok' | 'alto' | 'excedido';

export function estadoCantidadTarjetas(cantidad: number): EstadoCantidad {
  if (cantidad > MAX_TARJETAS) return 'excedido';
  if (cantidad > MAX_RECOMENDADAS) return 'alto';
  if (cantidad < MIN_RECOMENDADAS) return 'bajo';
  return 'ok';
}

// Devuelve el primer problema que impide crear el estudio, o null.
export function validarEstudio(params: {
  nombre: string;
  esCerrado: boolean;
  esHibrido?: boolean;
  tarjetas: AnalisisEntrada;
  categorias: AnalisisEntrada;
  preguntas?: AnalisisEntrada;
}): string | null {
  const { nombre, esCerrado, esHibrido = false, tarjetas, categorias, preguntas } = params;
  if (!nombre.trim()) return 'Escribe un nombre para el estudio.';
  if (tarjetas.items.length === 0) return 'Agrega al menos una tarjeta.';
  if (tarjetas.items.length > MAX_TARJETAS) return `El máximo es ${MAX_TARJETAS} tarjetas.`;
  if (tarjetas.excedidas.length > 0) return `Hay tarjetas de más de ${MAX_ETIQUETA} caracteres. Acórtalas.`;
  if (tarjetas.duplicados.length > 0) return `Hay tarjetas duplicadas: ${tarjetas.duplicados.slice(0, 3).join(', ')}. Quita las repetidas.`;
  if (esCerrado || esHibrido) {
    if (esCerrado && categorias.items.length < MIN_CATEGORIAS_CERRADO) return `Un estudio cerrado necesita al menos ${MIN_CATEGORIAS_CERRADO} categorías.`;
    if (esHibrido && categorias.items.length < 1) return 'Un estudio híbrido necesita al menos una categoría predefinida.';
    if (categorias.excedidas.length > 0) return `Hay categorías de más de ${MAX_CATEGORIA} caracteres. Acórtalas.`;
    if (categorias.duplicados.length > 0) return `Hay categorías duplicadas: ${categorias.duplicados.slice(0, 3).join(', ')}.`;
  }
  if (preguntas) {
    if (preguntas.items.length > MAX_PREGUNTAS) return `El máximo es ${MAX_PREGUNTAS} preguntas.`;
    if (preguntas.excedidas.length > 0) return `Hay preguntas de más de ${MAX_PREGUNTA} caracteres. Acórtalas.`;
  }
  return null;
}
