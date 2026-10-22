import { describe, expect, it } from 'vitest';
import { EVIDENCIA_MAX_BYTES } from '@observatorio-ux/shared-types';
import { detectarMimeEvidencia, normalizarTipoEvidencia, validarImagenEvidencia } from './evidencia-validar';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const archivo = (bytes: number[], name: string, type: string) => new File([new Uint8Array(bytes)], name, { type });

describe('validarImagenEvidencia', () => {
  it.each([['PNG', PNG, 'a.png', 'image/png'], ['JPEG', JPEG, 'a.jpg', 'image/jpeg'], ['WebP', WEBP, 'a.webp', 'image/webp']])('acepta %s real', async (_n, bytes, name, type) => {
    expect(await validarImagenEvidencia(archivo(bytes, name, type))).toBeNull();
  });
  it('rechaza SVG por tipo y por nombre', async () => {
    expect(await validarImagenEvidencia(archivo(PNG, 'a.png', 'image/svg+xml'))).toMatch(/SVG/);
    expect(await validarImagenEvidencia(archivo(PNG, 'dibujo.SVG', ''))).toMatch(/SVG/);
  });
  it('rechaza un archivo que declara ser imagen pero no lo es', async () => {
    expect(await validarImagenEvidencia(new File(['<script>alert(1)</script>'], 'a.png', { type: 'image/png' }))).toMatch(/Formato no permitido/);
  });
  it('rechaza archivos vacíos', async () => {
    expect(await validarImagenEvidencia(new File([], 'a.png', { type: 'image/png' }))).toMatch(/vacía/);
  });
  it('valida el tamaño salvo que se omita', async () => {
    const grande = new File([new Uint8Array([...PNG, ...new Array(EVIDENCIA_MAX_BYTES)])], 'a.png', { type: 'image/png' });
    expect(await validarImagenEvidencia(grande)).toMatch(/4 MB/);
    expect(await validarImagenEvidencia(grande, { omitirTamano: true })).toBeNull();
  });
  it('acepta una imagen real aunque no declare tipo', async () => {
    expect(await validarImagenEvidencia(archivo(PNG, 'image.png', ''))).toBeNull();
  });
});

describe('detectarMimeEvidencia y normalizarTipoEvidencia', () => {
  it('detecta por contenido y devuelve null si no es imagen', async () => {
    expect(await detectarMimeEvidencia(archivo(JPEG, 'a', ''))).toBe('image/jpeg');
    expect(await detectarMimeEvidencia(new Blob(['hola']))).toBeNull();
  });
  it('reenvuelve con el tipo real solo cuando difiere', async () => {
    const sinTipo = archivo(PNG, 'captura.png', '');
    const normalizado = await normalizarTipoEvidencia(sinTipo);
    expect(normalizado.type).toBe('image/png');
    expect(normalizado.name).toBe('captura.png');
    const correcto = archivo(PNG, 'a.png', 'image/png');
    expect(await normalizarTipoEvidencia(correcto)).toBe(correcto);
  });
});
