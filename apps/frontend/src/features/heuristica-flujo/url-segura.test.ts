import { describe, expect, it } from 'vitest';
import { PersonaSchema, esUrlSegura, normalizarUrlProducto } from '@observatorio-ux/shared-types';
import { faltantesParaIniciar } from './flujo-utils';
import type { ConfiguracionFlujo } from '@observatorio-ux/shared-types';

describe('normalizarUrlProducto', () => {
  it.each([
    ['miweb.cl', 'https://miweb.cl'],
    ['www.miweb.cl', 'https://www.miweb.cl'],
    ['HTTP://X.CL', 'http://x.cl'],
    ['  miweb.cl  ', 'https://miweb.cl'],
    ['localhost', 'https://localhost'],
    ['localhost:3000/app', 'https://localhost:3000/app'],
    ['https://miweb.cl/Ruta?a=1#b', 'https://miweb.cl/Ruta?a=1#b'],
  ])('acepta %s -> %s', (entrada, esperado) => {
    expect(normalizarUrlProducto(entrada)).toBe(esperado);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///etc/passwd',
    'ftp://x.cl',
    '//evil.com',
    'https://user:pass@x.cl',
    'http://intranet',
    'https://miweb.cl:99999',
    'https://mi web.cl',
    'https://miweb.cl/<script>',
    '',
    '   ',
    `https://x.cl/${'a'.repeat(2000)}`,
  ])('rechaza %s', entrada => {
    expect(normalizarUrlProducto(entrada)).toBeNull();
  });

  it('acepta exactamente 2000 caracteres y rechaza 2001', () => {
    const base = 'https://x.cl/';
    expect(normalizarUrlProducto(base + 'a'.repeat(2000 - base.length))).not.toBeNull();
    expect(normalizarUrlProducto(base + 'a'.repeat(2001 - base.length))).toBeNull();
  });
});

describe('esUrlSegura', () => {
  it('exige esquema http o https explicito y valor valido', () => {
    expect(esUrlSegura('https://miweb.cl')).toBe(true);
    expect(esUrlSegura('HTTP://X.CL')).toBe(true);
    expect(esUrlSegura('miweb.cl')).toBe(false);
    expect(esUrlSegura('javascript:alert(1)')).toBe(false);
    expect(esUrlSegura('http://intranet')).toBe(false);
  });
});

describe('fotografiaUrl de Persona', () => {
  it('acepta http(s) y ausencia, rechaza esquemas peligrosos', () => {
    expect(PersonaSchema.parse({ nombreCompleto: 'Ana' }).fotografiaUrl).toBeUndefined();
    expect(PersonaSchema.parse({ nombreCompleto: 'Ana', fotografiaUrl: 'https://miweb.cl/foto.png' }).fotografiaUrl).toBe('https://miweb.cl/foto.png');
    for (const fotografiaUrl of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.cl/a.png']) {
      expect(() => PersonaSchema.parse({ nombreCompleto: 'Ana', fotografiaUrl })).toThrow();
    }
  });
});

describe('faltantesParaIniciar con URL', () => {
  const config = (url: string) => ({ producto: { nombre: 'Web', url }, metodologia: { criterios: [{}] }, evaluadorIds: ['a'] }) as unknown as ConfiguracionFlujo;
  it('no pide URL vacia ni sin esquema, y rechaza esquemas peligrosos', () => {
    expect(faltantesParaIniciar(config(''))).toEqual([]);
    expect(faltantesParaIniciar(config('miweb.cl'))).toEqual([]);
    expect(faltantesParaIniciar(config('javascript:alert(1)'))).toHaveLength(1);
  });
});
