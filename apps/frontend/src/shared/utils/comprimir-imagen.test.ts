import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { comprimirImagen } from './comprimir-imagen';

const MB = 1024 * 1024;
const png = (bytes: number) => new File([new Uint8Array(bytes)], 'captura.png', { type: 'image/png' });

let tamanos: number[];
let tipoSalida: string;
let llamadas: { w: number; h: number }[];

beforeEach(() => {
  tamanos = [];
  tipoSalida = 'image/webp';
  llamadas = [];
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3840, height: 2160, close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn() } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback, tipo?: string) {
    llamadas.push({ w: this.width, h: this.height });
    const size = tamanos.shift() ?? 10 * MB;
    cb(new Blob([new Uint8Array(size)], { type: tipo === 'image/webp' ? tipoSalida : tipo }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('comprimirImagen', () => {
  it('omite archivos chicos y formatos no permitidos', async () => {
    const chico = png(100 * 1024);
    expect(await comprimirImagen(chico)).toBe(chico);
    const svg = new File([new Uint8Array(2 * MB)], 'a.svg', { type: 'image/svg+xml' });
    expect(await comprimirImagen(svg)).toBe(svg);
  });

  it('devuelve el original si el navegador no puede decodificar', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('no'); }));
    const grande = png(6 * MB);
    expect(await comprimirImagen(grande)).toBe(grande);
  });

  it('reduce a WebP, acota el lado mayor a 2560 px y cambia la extension', async () => {
    tamanos = [MB];
    const salida = await comprimirImagen(png(6 * MB));
    expect(salida.type).toBe('image/webp');
    expect(salida.size).toBe(MB);
    expect(salida.name).toBe('captura.webp');
    expect(llamadas[0].w).toBe(2560);
  });

  it('baja calidad y luego dimensiones hasta entrar bajo el objetivo', async () => {
    tamanos = [5 * MB, 4 * MB, 3.5 * MB, 2 * MB];
    const salida = await comprimirImagen(png(9 * MB));
    expect(salida.size).toBe(2 * MB);
    expect(llamadas).toHaveLength(4);
    expect(llamadas[3].w).toBeLessThan(llamadas[0].w);
  });

  it('cae a JPEG si el navegador no codifica WebP', async () => {
    tipoSalida = 'image/png';
    tamanos = [10 * MB, MB];
    const salida = await comprimirImagen(png(6 * MB));
    expect(salida.type).toBe('image/jpeg');
    expect(salida.name).toBe('captura.jpg');
  });

  it('devuelve el original si nada baja del maximo', async () => {
    const grande = png(12 * MB);
    expect(await comprimirImagen(grande)).toBe(grande);
  });

  it('conserva el original si ya pesa poco y el resultado no lo mejora', async () => {
    tamanos = [2 * MB];
    const original = png(MB);
    expect(await comprimirImagen(original)).toBe(original);
  });
});
