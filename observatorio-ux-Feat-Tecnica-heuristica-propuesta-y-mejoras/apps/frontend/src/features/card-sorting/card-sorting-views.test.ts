import { describe, expect, it } from 'vitest';
import type { CardSortingAnalytics } from './api/card-sorting.api';
import {
  colorDe,
  aplicarUmbralConsenso,
  fichasCategorias,
  filasTarjetas,
  filtrarCategorias,
  filtrarTarjetas,
  pct,
  resumenTarjetas,
} from './card-sorting-views';

const data = {
  participantesCount: 4,
  categorias: ['Servicios', 'Vida'],
  umbrales: { consenso: 50, muestraMinima: 15, muestraEstable: 30 },
  frecuenciaPorCategoria: [{ nombre: 'Servicios', count: 5, porcentaje: 80 }],
  porCarta: [
    { tarjeta: 'Becas', categoriasCount: 1, categorias: [{ nombre: 'Servicios', frecuencia: 3 }, { nombre: 'Vida', frecuencia: 1 }] },
    { tarjeta: 'Biblioteca', categoriasCount: 2, categorias: [{ nombre: 'Servicios', frecuencia: 2 }, { nombre: 'Vida', frecuencia: 2 }] },
    { tarjeta: 'Deportes', categoriasCount: 0, categorias: [] },
  ],
  porCategoria: [
    {
      nombre: 'Servicios',
      cardsCount: 2,
      cartas: [{ tarjeta: 'Becas', frecuencia: 3 }, { tarjeta: 'Biblioteca', frecuencia: 2 }],
      subcategorias: [{ nombre: 'Apoyo', cartas: [{ tarjeta: 'Becas', frecuencia: 1 }] }],
    },
    { nombre: 'Vida', cardsCount: 1, cartas: [{ tarjeta: 'Biblioteca', frecuencia: 2 }] },
  ],
} as unknown as CardSortingAnalytics;

describe('card-sorting-views', () => {
  it('recalcula grupos y sin consenso sin mutar los datos de la API', () => {
    const resultado = aplicarUmbralConsenso(data, 75);
    expect(resultado.clusters).toEqual([]);
    expect(resultado.sinConsenso).toEqual(['Becas', 'Biblioteca']);
    expect(filasTarjetas(resultado).map((f) => f.estado)).toEqual(['sin-consenso', 'sin-consenso', 'sin-datos']);
    expect(aplicarUmbralConsenso(data, 60).clusters).toEqual([{ nombre: 'Servicios', tarjetas: ['Becas'], acuerdo: 75 }]);
    expect(data.umbrales.consenso).toBe(50);
    for (const invalido of [0, 49, 96, 70.5, NaN]) expect(aplicarUmbralConsenso(data, invalido)).toBe(data);
  });
  it('pct redondea y tolera total 0', () => {
    expect(pct(2, 3)).toBe(67);
    expect(pct(1, 0)).toBe(0);
  });

  it('colorDe asigna por orden de categoría y usa el neutro si no existe', () => {
    expect(colorDe('Servicios', data.categorias)).toBe(1);
    expect(colorDe('Vida', data.categorias)).toBe(2);
    expect(colorDe('Otra', data.categorias)).toBe(8);
  });

  it('clasifica el consenso con el criterio "más del umbral" (50% exacto no es consenso)', () => {
    const filas = filasTarjetas(data);
    expect(filas.map((f) => f.estado)).toEqual(['consenso', 'sin-consenso', 'sin-datos']);
    expect(filas[0].segmentos[0]).toMatchObject({ nombre: 'Servicios', pct: 75 });
    expect(resumenTarjetas(filas)).toEqual({ consenso: 1, sinConsenso: 1, sinDatos: 1 });
  });

  it('filtra por texto sin tildes, por "solo sin consenso" y ordena', () => {
    const filas = filasTarjetas(data);
    expect(filtrarTarjetas(filas, { texto: 'BIBLIO', orden: 'estudio', soloSinConsenso: false }).map((f) => f.tarjeta)).toEqual(['Biblioteca']);
    expect(filtrarTarjetas(filas, { texto: '', orden: 'estudio', soloSinConsenso: true }).map((f) => f.tarjeta)).toEqual(['Biblioteca']);
    expect(filtrarTarjetas(filas, { texto: '', orden: 'menor', soloSinConsenso: false }).map((f) => f.tarjeta)).toEqual(['Deportes', 'Biblioteca', 'Becas']);
    expect(filtrarTarjetas(filas, { texto: '', orden: 'nombre', soloSinConsenso: false }).map((f) => f.tarjeta)).toEqual(['Becas', 'Biblioteca', 'Deportes']);
  });

  it('arma las fichas de categoría con uso, bajo acuerdo y subcategorías', () => {
    const fichas = fichasCategorias(data);
    expect(fichas[0]).toMatchObject({ nombre: 'Servicios', usoPct: 80, conConsenso: true });
    expect(fichas[0].cartas.map((c) => c.bajoAcuerdo)).toEqual([false, true]);
    expect(fichas[0].subcategorias[0].nombre).toBe('Apoyo');
    expect(fichas[1]).toMatchObject({ usoPct: null, conConsenso: false });
  });

  it('busca categorías por nombre o por tarjeta', () => {
    const fichas = fichasCategorias(data);
    expect(filtrarCategorias(fichas, 'vida').map((f) => f.nombre)).toEqual(['Vida']);
    expect(filtrarCategorias(fichas, 'becas').map((f) => f.nombre)).toEqual(['Servicios']);
  });
});
