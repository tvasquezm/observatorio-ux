import type { CardSortingAnalytics } from './api/card-sorting.api';
import { normalizarTexto } from './card-sorting-input';

export type EstadoTarjeta = 'consenso' | 'sin-consenso' | 'sin-datos';

export interface SegmentoCategoria {
  nombre: string;
  frecuencia: number;
  pct: number;
  color: number;
}

export interface FilaTarjeta {
  tarjeta: string;
  categoriasCount: number;
  segmentos: SegmentoCategoria[];
  lider: SegmentoCategoria | null;
  estado: EstadoTarjeta;
}

export interface CartaEnCategoria {
  tarjeta: string;
  frecuencia: number;
  pct: number;
  bajoAcuerdo: boolean;
}

export interface FichaCategoria {
  nombre: string;
  color: number;
  cardsCount: number;
  usoPct: number | null;
  cartas: CartaEnCategoria[];
  subcategorias: Array<{ nombre: string; cartas: CartaEnCategoria[] }>;
  conConsenso: boolean;
}

export const PALETA = 8;

export function pct(frecuencia: number, total: number): number {
  return total > 0 ? Math.round((frecuencia / total) * 100) : 0;
}

export function colorDe(nombre: string, categorias: string[]): number {
  const indice = categorias.indexOf(nombre);
  return indice < 0 ? PALETA : (indice % (PALETA - 1)) + 1;
}

// Consenso = criterio del curso: más del umbral de participantes en la misma categoría.
export function filasTarjetas(data: CardSortingAnalytics): FilaTarjeta[] {
  const total = data.participantesCount;
  return data.porCarta.map((carta) => {
    const segmentos = carta.categorias.map((categoria) => ({
      nombre: categoria.nombre,
      frecuencia: categoria.frecuencia,
      pct: pct(categoria.frecuencia, total),
      color: colorDe(categoria.nombre, data.categorias),
    }));
    const lider = segmentos[0] ?? null;
    const estado: EstadoTarjeta = !lider
      ? 'sin-datos'
      : (lider.frecuencia / total) * 100 > data.umbrales.consenso
        ? 'consenso'
        : 'sin-consenso';
    return { tarjeta: carta.tarjeta, categoriasCount: carta.categoriasCount, segmentos, lider, estado };
  });
}

export function resumenTarjetas(filas: FilaTarjeta[]) {
  return {
    consenso: filas.filter((fila) => fila.estado === 'consenso').length,
    sinConsenso: filas.filter((fila) => fila.estado === 'sin-consenso').length,
    sinDatos: filas.filter((fila) => fila.estado === 'sin-datos').length,
  };
}

export type OrdenTarjetas = 'estudio' | 'menor' | 'mayor' | 'nombre';

export function filtrarTarjetas(
  filas: FilaTarjeta[],
  opciones: { texto: string; orden: OrdenTarjetas; soloSinConsenso: boolean },
): FilaTarjeta[] {
  const consulta = normalizarTexto(opciones.texto);
  const lista = filas.filter((fila) => {
    if (opciones.soloSinConsenso && fila.estado !== 'sin-consenso') return false;
    return consulta === '' || normalizarTexto(fila.tarjeta).includes(consulta);
  });
  const liderPct = (fila: FilaTarjeta) => fila.lider?.pct ?? -1;
  if (opciones.orden === 'menor') return [...lista].sort((a, b) => liderPct(a) - liderPct(b));
  if (opciones.orden === 'mayor') return [...lista].sort((a, b) => liderPct(b) - liderPct(a));
  if (opciones.orden === 'nombre') return [...lista].sort((a, b) => a.tarjeta.localeCompare(b.tarjeta, 'es'));
  return lista;
}

export function fichasCategorias(data: CardSortingAnalytics): FichaCategoria[] {
  const total = data.participantesCount;
  const convertir = (cartas: Array<{ tarjeta: string; frecuencia: number }>): CartaEnCategoria[] =>
    cartas.map((carta) => ({
      tarjeta: carta.tarjeta,
      frecuencia: carta.frecuencia,
      pct: pct(carta.frecuencia, total),
      bajoAcuerdo: total > 0 && (carta.frecuencia / total) * 100 <= data.umbrales.consenso,
    }));
  return data.porCategoria.map((categoria) => {
    const cartas = convertir(categoria.cartas);
    const uso = data.frecuenciaPorCategoria.find((item) => item.nombre === categoria.nombre);
    return {
      nombre: categoria.nombre,
      color: colorDe(categoria.nombre, data.categorias),
      cardsCount: categoria.cardsCount,
      usoPct: uso ? uso.porcentaje : null,
      cartas,
      subcategorias: (categoria.subcategorias ?? []).map((sub) => ({ nombre: sub.nombre, cartas: convertir(sub.cartas) })),
      conConsenso: cartas.some((carta) => !carta.bajoAcuerdo),
    };
  });
}

export function filtrarCategorias(fichas: FichaCategoria[], texto: string): FichaCategoria[] {
  const consulta = normalizarTexto(texto);
  if (!consulta) return fichas;
  return fichas.filter(
    (ficha) =>
      normalizarTexto(ficha.nombre).includes(consulta) ||
      ficha.cartas.some((carta) => normalizarTexto(carta.tarjeta).includes(consulta)),
  );
}
