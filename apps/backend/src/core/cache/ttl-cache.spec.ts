import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  let now: number;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  it('devuelve el valor mientras no venza el TTL', () => {
    const cache = new TtlCache<string>(30_000);
    cache.set('a', 'uno');

    now += 29_999;

    expect(cache.get('a')).toBe('uno');
  });

  it('descarta el valor al vencer el TTL', () => {
    const cache = new TtlCache<string>(30_000);
    cache.set('a', 'uno');

    now += 30_000;

    expect(cache.get('a')).toBeUndefined();
  });

  it('delete y clear eliminan entradas', () => {
    const cache = new TtlCache<string>(30_000);
    cache.set('a', 'uno');
    cache.set('b', 'dos');

    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('dos');

    cache.clear();
    expect(cache.get('b')).toBeUndefined();
  });

  it('al llegar al tope descarta la entrada más antigua', () => {
    const cache = new TtlCache<number>(30_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('reescribir una clave renueva su TTL y su posición', () => {
    const cache = new TtlCache<number>(30_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    now += 20_000;
    cache.set('a', 10);
    cache.set('c', 3);

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(10);
  });
});
