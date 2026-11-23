import { expect, it } from 'vitest';
import { table, title } from './pdf-base';

it('separa filas de datos con líneas finas y destaca la primera columna', () => {
  const node = table(['Nombre', 'Total'], [['A', 5], ['B', 4]]);
  if (typeof node !== 'object' || !('table' in node) || typeof node.layout !== 'object') {
    throw new Error('Se esperaba una tabla con diseño propio');
  }
  expect(node.layout.hLineWidth?.(0, node)).toBe(0);
  expect(node.layout.hLineWidth?.(1, node)).toBe(0.5);
  expect(node.layout.hLineWidth?.(2, node)).toBe(0.5);
  expect(node.layout.hLineWidth?.(3, node)).toBe(0);
  expect(node.table.body[1][0]).toMatchObject({ text: 'A', bold: true });
});

it('conserva el nivel del título y agrega un acento debajo', () => {
  expect(title('Detalle')).toMatchObject({
    stack: [
      { text: 'Detalle', style: 'subheading', headlineLevel: 2 },
      { canvas: [{ type: 'line', x1: 0, x2: 28, lineWidth: 2 }] },
    ],
  });
});
