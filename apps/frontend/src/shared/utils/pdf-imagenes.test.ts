import { afterEach, describe, expect, it, vi } from 'vitest';
import { imagenAPng, prepararImagenesReporte } from './pdf';
import type { ProjectReport } from '../../features/reports/report-data';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('imágenes del informe PDF', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deja tal cual las fotos PNG o JPEG y devuelve null si no puede leer la imagen', async () => {
    expect(await imagenAPng(PNG)).toBe(PNG);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('CORS'); }));
    expect(await imagenAPng('https://ejemplo.cl/foto.webp')).toBeNull();
  });

  it('prepara las fotos de las personas: conserva las incrustables y quita las que no se pueden leer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('CORS'); }));
    const report = {
      personas: [
        { artefactoLogicoId: 'a', contenido: { nombreCompleto: 'Ana', fotografiaUrl: PNG } },
        { artefactoLogicoId: 'b', contenido: { nombreCompleto: 'Beto', fotografiaUrl: 'https://ejemplo.cl/foto.webp' } },
      ],
      partes: {},
    } as unknown as ProjectReport;
    const listo = await prepararImagenesReporte(report);
    expect(listo.personas?.map(p => p.contenido.fotografiaUrl)).toEqual([PNG, undefined]);
    expect(listo.imagenes).toEqual({});
  });
});
