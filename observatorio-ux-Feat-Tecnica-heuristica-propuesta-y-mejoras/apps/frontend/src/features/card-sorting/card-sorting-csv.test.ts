import { afterEach, describe, expect, it, vi } from 'vitest';
import { descargarCsv, escaparCeldaCsv, generarCsv, matrizACsv, similitudACsv, tablaACsv } from './card-sorting-csv';

describe('escaparCeldaCsv', () => {
  it.each(['=1+1', '+SUMA(A1)', '-2+3', '@cmd', '\tx', '\rx'])('neutraliza la fórmula %j', (valor) => {
    expect(escaparCeldaCsv(valor).replace(/^"|"$/g, '').startsWith("'")).toBe(true);
  });

  it('deja intactos los números, incluso negativos', () => {
    expect(escaparCeldaCsv(-5)).toBe('-5');
    expect(escaparCeldaCsv(80)).toBe('80');
  });

  it('no altera texto normal ni un signo en medio', () => {
    expect(escaparCeldaCsv('Biblioteca')).toBe('Biblioteca');
    expect(escaparCeldaCsv('a=b')).toBe('a=b');
  });

  it('entrecomilla y duplica comillas, punto y coma y saltos de línea', () => {
    expect(escaparCeldaCsv('di "hola"; ok')).toBe('"di ""hola""; ok"');
    expect(escaparCeldaCsv('a, b')).toBe('a, b');
    expect(escaparCeldaCsv('a\nb')).toBe('"a\nb"');
  });

  it('combina neutralización y comillas', () => {
    expect(escaparCeldaCsv('=HYPERLINK("x";"y")')).toBe('"\'=HYPERLINK(""x"";""y"")"');
  });
});

describe('generarCsv / matrices', () => {
  it('une filas con CRLF', () => {
    expect(generarCsv([['a', 1], ['b', 2]])).toBe('a;1\r\nb;2');
  });

  it('matriz de resultados: encabezado, tarjetas y escape en nombres de categoría', () => {
    const csv = matrizACsv({ categorias: ['Servicios', '=evil'], filas: [{ tarjeta: 'Biblioteca', valores: [3, 0] }] });
    expect(csv).toBe("Tarjeta;Servicios;'=evil\r\nBiblioteca;3;0");
  });

  it('similitud: tarjetas en filas y columnas', () => {
    expect(similitudACsv(['A', 'B'], [[100, 40], [40, 100]])).toBe('Tarjeta;A;B\r\nA;100;40\r\nB;40;100');
  });
});

describe('tablaACsv', () => {
  it('encabezado y filas con texto, números y celdas vacías', () => {
    expect(tablaACsv({ columnas: ['Tarjeta', 'Estado', '%'], filas: [['Becas', 'Consenso', 80], ['Otra', 'Sin datos', '']] })).toBe(
      'Tarjeta;Estado;%\r\nBecas;Consenso;80\r\nOtra;Sin datos;',
    );
  });
});

describe('descargarCsv', () => {
  afterEach(() => vi.restoreAllMocks());

  it('crea un enlace de descarga con el nombre indicado y libera la URL', () => {
    const crear = vi.fn(() => 'blob:x');
    const revocar = vi.fn();
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    descargarCsv('r.csv', 'a,b');
    expect(crear).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revocar).toHaveBeenCalledWith('blob:x');
  });
});
