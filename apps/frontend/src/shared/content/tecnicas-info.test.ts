import { describe, expect, it } from 'vitest';
import { TECNICAS_INFO } from './tecnicas-info';

describe('contenido de las cinco técnicas', () => {
  it('incluye descripciones breves y las cuatro explicaciones requeridas', () => {
    expect(Object.keys(TECNICAS_INFO)).toHaveLength(5);
    for (const info of Object.values(TECNICAS_INFO)) {
      expect(info.descripcionCorta.length).toBeLessThanOrEqual(160);
      expect(info.explicacionCompleta.secciones.map(s => s.encabezado)).toEqual(['Qué es', 'Cuándo usarla', 'Cómo se hace paso a paso', 'Cómo leer los resultados']);
      expect(info.explicacionCompleta.secciones.every(s => s.parrafos?.length || s.pasos?.length)).toBe(true);
    }
  });
});
