import { avisarProyecto } from '../../modules/artifacts/artifacts-eventos.js';
import { CachePorProyecto } from './cache-por-proyecto.js';

describe('CachePorProyecto', () => {
  let cache: CachePorProyecto<number>;
  beforeEach(() => { cache = new CachePorProyecto<number>(60_000); });
  afterEach(() => cache.cerrar());

  it('reutiliza el resultado y comparte el cálculo de peticiones simultáneas', async () => {
    const calcular = jest.fn().mockResolvedValue(7);
    const [a, b] = await Promise.all([cache.obtener('p1', 'k', calcular), cache.obtener('p1', 'k', calcular)]);
    await cache.obtener('p1', 'k', calcular);
    expect([a, b]).toEqual([7, 7]);
    expect(calcular).toHaveBeenCalledTimes(1);
  });

  it('separa por proyecto y por clave', async () => {
    const calcular = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    expect(await cache.obtener('p1', 'a', calcular)).toBe(1);
    expect(await cache.obtener('p1', 'b', calcular)).toBe(2);
    expect(await cache.obtener('p2', 'a', calcular)).toBe(3);
  });

  it('descarta las entradas de un proyecto cuando llega un aviso de cambio, y solo de ese', async () => {
    const calcular = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    await cache.obtener('p1', 'k', calcular);
    await cache.obtener('p2', 'k', calcular);
    avisarProyecto('p1', 'comentarios', 'u1');
    expect(await cache.obtener('p1', 'k', calcular)).toBe(3);
    expect(await cache.obtener('p2', 'k', calcular)).toBe(2);
  });

  it('caduca por tiempo y no conserva los cálculos fallidos', async () => {
    jest.useFakeTimers();
    try {
      const calcular = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      await cache.obtener('p1', 'k', calcular);
      jest.setSystemTime(Date.now() + 61_000);
      expect(await cache.obtener('p1', 'k', calcular)).toBe(2);

      const falla = jest.fn().mockRejectedValueOnce(new Error('base caída')).mockResolvedValueOnce(9);
      await expect(cache.obtener('p3', 'k', falla)).rejects.toThrow('base caída');
      expect(await cache.obtener('p3', 'k', falla)).toBe(9);
    } finally {
      jest.useRealTimers();
    }
  });
});
