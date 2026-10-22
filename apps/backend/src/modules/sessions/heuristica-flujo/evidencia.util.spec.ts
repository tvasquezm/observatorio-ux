import { detectarMimeImagen } from './evidencia.util.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);

describe('detectarMimeImagen', () => {
  it('reconoce PNG, JPEG y WebP por magic bytes', () => {
    expect(detectarMimeImagen(PNG)).toBe('image/png');
    expect(detectarMimeImagen(JPG)).toBe('image/jpeg');
    expect(detectarMimeImagen(WEBP)).toBe('image/webp');
  });

  it('rechaza SVG, HTML, GIF y buffers vacíos o truncados', () => {
    expect(detectarMimeImagen(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectarMimeImagen(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectarMimeImagen(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectarMimeImagen(Buffer.alloc(0))).toBeNull();
    expect(detectarMimeImagen(PNG.subarray(0, 4))).toBeNull();
  });
});
