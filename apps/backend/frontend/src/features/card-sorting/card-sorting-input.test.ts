import { describe, expect, it } from 'vitest';
import {
  agregarLinea,
  analizarEntrada,
  elementosNuevos,
  estadoCantidadTarjetas,
  existeElemento,
  quitarElemento,
  validarEstudio,
} from './card-sorting-input';

describe('analizarEntrada', () => {
  it('descarta líneas vacías y recorta espacios', () => {
    const r = analizarEntrada('  Biblioteca  \n\n   \nCalendario', 100);
    expect(r.items).toEqual(['Biblioteca', 'Calendario']);
  });

  it('detecta duplicados sin importar tildes ni mayúsculas, una sola vez', () => {
    const r = analizarEntrada('Navegación\nnavegacion\nNAVEGACIÓN\nBiblioteca', 100);
    expect(r.duplicados).toEqual(['navegacion']);
  });

  it('marca líneas desde 80 caracteres y separa las que pasan de 100', () => {
    const r = analizarEntrada(['a'.repeat(79), 'b'.repeat(80), 'c'.repeat(100), 'd'.repeat(101)].join('\n'), 100, 80);
    expect(r.largas.map((x) => x.length)).toEqual([80, 100]);
    expect(r.excedidas.map((x) => x.length)).toEqual([101]);
  });
});

describe('estadoCantidadTarjetas', () => {
  it.each([
    [0, 'bajo'],
    [14, 'bajo'],
    [15, 'ok'],
    [40, 'ok'],
    [41, 'alto'],
    [100, 'alto'],
    [101, 'excedido'],
  ])('%i tarjetas → %s', (n, esperado) => {
    expect(estadoCantidadTarjetas(n)).toBe(esperado);
  });
});

describe('validarEstudio', () => {
  const vacio = analizarEntrada('', 60);
  const tarjetas = analizarEntrada('A\nB', 100, 80);

  it('pide nombre y al menos una tarjeta, con mensaje', () => {
    expect(validarEstudio({ nombre: ' ', esCerrado: false, tarjetas, categorias: vacio })).toBe('Escribe un nombre para el estudio.');
    expect(validarEstudio({ nombre: 'E', esCerrado: false, tarjetas: vacio, categorias: vacio })).toBe('Agrega al menos una tarjeta.');
  });

  it('cerrado exige 2 categorías; abierto no', () => {
    const una = analizarEntrada('Servicios', 60);
    expect(validarEstudio({ nombre: 'E', esCerrado: true, tarjetas, categorias: una })).toBe('Un estudio cerrado necesita al menos 2 categorías.');
    expect(validarEstudio({ nombre: 'E', esCerrado: false, tarjetas, categorias: una })).toBeNull();
    expect(validarEstudio({ nombre: 'E', esCerrado: true, tarjetas, categorias: analizarEntrada('Uno\nDos', 60) })).toBeNull();
  });

  it('híbrido exige 1 categoría predefinida', () => {
    const una = analizarEntrada('Servicios', 60);
    expect(validarEstudio({ nombre: 'E', esCerrado: false, esHibrido: true, tarjetas, categorias: vacio })).toBe('Un estudio híbrido necesita al menos una categoría predefinida.');
    expect(validarEstudio({ nombre: 'E', esCerrado: false, esHibrido: true, tarjetas, categorias: una })).toBeNull();
  });

  it('rechaza duplicados y tope de 100 tarjetas', () => {
    expect(validarEstudio({ nombre: 'E', esCerrado: false, tarjetas: analizarEntrada('A\na', 100), categorias: vacio })).toMatch(/duplicadas/);
    const muchas = analizarEntrada(Array.from({ length: 101 }, (_, i) => `T${i}`).join('\n'), 100);
    expect(validarEstudio({ nombre: 'E', esCerrado: false, tarjetas: muchas, categorias: vacio })).toBe('El máximo es 100 tarjetas.');
  });
});

describe('agregarLinea y quitarElemento', () => {
  it('agrega como línea nueva y limpia el valor', () => {
    expect(agregarLinea('A\nB', '  C ')).toBe('A\nB\nC');
    expect(agregarLinea('', 'C')).toBe('C');
    expect(agregarLinea('A\n\n', 'C')).toBe('A\nC');
  });

  it('ignora valores vacíos', () => {
    expect(agregarLinea('A', '   ')).toBe('A');
  });

  it('quita el n-ésimo elemento no vacío, igual que analizarEntrada', () => {
    const texto = 'A\n\nB\n  \nC';
    expect(quitarElemento(texto, 1)).toBe('A\n\n  \nC');
    expect(analizarEntrada(quitarElemento(texto, 2), 100).items).toEqual(['A', 'B']);
  });
});

describe('elementosNuevos y existeElemento', () => {
  it('separa por líneas y omite lo ya existente y lo repetido en el bloque', () => {
    const r = elementosNuevos('Becas\nBiblioteca', 'biblioteca\nCalendario\n\ncalendario\n  Pagos  ');
    expect(r.nuevas).toEqual(['Calendario', 'Pagos']);
    expect(r.omitidas).toBe(2);
  });

  it('una línea con comas se mantiene como una sola', () => {
    expect(elementosNuevos('', 'Pagos, becas y aranceles').nuevas).toEqual(['Pagos, becas y aranceles']);
  });

  it('existeElemento ignora tildes y mayúsculas, y no cuenta valores vacíos', () => {
    expect(existeElemento('Navegación', 'navegacion')).toBe(true);
    expect(existeElemento('Navegación', 'Otra')).toBe(false);
    expect(existeElemento('Navegación', '  ')).toBe(false);
  });
});
