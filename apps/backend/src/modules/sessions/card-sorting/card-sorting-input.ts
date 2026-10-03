import { BadRequestException } from '@nestjs/common';

// Normaliza para comparar: sin tildes ni mayúsculas, sin espacios al borde.
// Misma regla que el frontend (card-sorting-input.ts) y que el análisis de
// categorías, para que "Navegación" y "navegacion" cuenten como lo mismo.
export function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL');
}

function duplicados(valores: string[]): string[] {
  const vistos = new Map<string, string>();
  const repetidos = new Map<string, string>();
  for (const valor of valores) {
    const clave = normalizarTexto(valor);
    if (vistos.has(clave)) repetidos.set(clave, vistos.get(clave) as string);
    else vistos.set(clave, valor.trim());
  }
  return [...repetidos.values()];
}

function listar(valores: string[]): string {
  const mostrados = valores.slice(0, 5).map((valor) => `"${valor}"`).join(', ');
  return valores.length > 5 ? `${mostrados} y ${valores.length - 5} más` : mostrados;
}

export function validarPreguntas(preguntas: string[]): void {
  if (preguntas.some((valor) => valor.trim() === '')) {
    throw new BadRequestException('Las preguntas no pueden estar vacías.');
  }
}

export function validarEntradaEstudio(
  esCerrado: boolean,
  tarjetas: string[],
  categorias: string[],
): void {
  if (tarjetas.some((valor) => valor.trim() === '')) {
    throw new BadRequestException('Las tarjetas no pueden estar vacías.');
  }
  const tarjetasRepetidas = duplicados(tarjetas);
  if (tarjetasRepetidas.length > 0) {
    throw new BadRequestException(`Hay tarjetas duplicadas: ${listar(tarjetasRepetidas)}.`);
  }
  if (categorias.some((valor) => valor.trim() === '')) {
    throw new BadRequestException('Las categorías no pueden estar vacías.');
  }
  const categoriasRepetidas = duplicados(categorias);
  if (categoriasRepetidas.length > 0) {
    throw new BadRequestException(`Hay categorías duplicadas: ${listar(categoriasRepetidas)}.`);
  }
  if (esCerrado && categorias.length < 2) {
    throw new BadRequestException(
      'Un Card Sorting cerrado requiere al menos dos categorías predefinidas.',
    );
  }
}
