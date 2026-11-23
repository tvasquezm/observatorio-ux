import { describe, expect, it } from 'vitest';
import { TECNICAS_INFO } from './tecnicas-info';

describe('contenido de las cinco técnicas', () => {
  it('incluye descripciones breves y no conserva la explicación completa', () => {
    expect(Object.keys(TECNICAS_INFO)).toHaveLength(5);
    for (const info of Object.values(TECNICAS_INFO)) {
      expect(info.descripcionCorta.length).toBeLessThanOrEqual(160);
      expect(info.descripcionCorta.length).toBeGreaterThan(0);
      expect(info).not.toHaveProperty('explicacionCompleta');
    }
  });
});
