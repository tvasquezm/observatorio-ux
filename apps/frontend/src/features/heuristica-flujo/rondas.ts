import type { CriterioFlujo } from '@observatorio-ux/shared-types';

export interface RondaFlujo { categorias: string[]; criterios: CriterioFlujo[] }

const MAX_RONDA = 4;
const MIN_RESTO = 3;

/**
 * Agrupa los criterios en rondas cortas siguiendo el orden de la metodología: categorías
 * seguidas hasta 4 criterios por ronda. Una categoría de más de 4 se parte en bloques de 4.
 * Si la última ronda queda con menos de 3 criterios, se une a la anterior.
 */
export function armarRondas(criterios: CriterioFlujo[]): RondaFlujo[] {
  const grupos = new Map<string, CriterioFlujo[]>();
  for (const c of criterios) grupos.set(c.categoria, [...(grupos.get(c.categoria) ?? []), c]);
  const rondas: RondaFlujo[] = [];
  let actual: RondaFlujo = { categorias: [], criterios: [] };
  const cerrar = () => { if (actual.criterios.length) rondas.push(actual); actual = { categorias: [], criterios: [] }; };
  for (const [categoria, lista] of grupos) {
    if (lista.length > MAX_RONDA) {
      cerrar();
      for (let i = 0; i < lista.length; i += MAX_RONDA) rondas.push({ categorias: [categoria], criterios: lista.slice(i, i + MAX_RONDA) });
      continue;
    }
    if (actual.criterios.length + lista.length > MAX_RONDA) cerrar();
    actual = { categorias: [...actual.categorias, categoria], criterios: [...actual.criterios, ...lista] };
  }
  cerrar();
  const resto = rondas[rondas.length - 1];
  if (rondas.length > 1 && resto.criterios.length < MIN_RESTO) {
    const anterior = rondas[rondas.length - 2];
    rondas.splice(-2, 2, { categorias: [...new Set([...anterior.categorias, ...resto.categorias])], criterios: [...anterior.criterios, ...resto.criterios] });
  }
  return rondas;
}
