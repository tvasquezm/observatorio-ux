import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HallazgoHeuristica } from './api/evaluacion-heuristica.api';
import { obtenerEvidenciaBlob } from './api/evaluacion-heuristica.api';
import { MAX_CAPTURAS_PDF, buildSesionHeuristicaPdfDefinition, cargarCapturas, slugArchivo } from './heuristica-pdf';

vi.mock('./api/evaluacion-heuristica.api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  obtenerEvidenciaBlob: vi.fn(),
}));

const h = (over: Partial<HallazgoHeuristica>): HallazgoHeuristica => ({
  id: 'x', heuristicaId: 'H4', severidad: 2, titulo: 'Título', pantalla: 'Login', descripcion: 'Descripción del problema.',
  evidencia: 'Evidencia', recomendacion: 'Recomendación', responsable: { id: 'u1', nombre: 'Ana Evaluadora' },
  registradoEn: '2026-10-01T00:00:00.000Z', ...over,
});
const sesion = { nombre: 'Portal de matrículas', createdAt: '2026-10-01T00:00:00.000Z', estado: 'COMPLETADO' as const, completadoAt: '2026-10-02T00:00:00.000Z' };
const AHORA = new Date('2026-10-08T12:00:00.000Z');
const texto = (def: unknown) => JSON.stringify(def);

beforeEach(() => vi.clearAllMocks());

describe('buildSesionHeuristicaPdfDefinition', () => {
  it('muestra nombre, estado, resumen y los hallazgos en el orden recibido', () => {
    const def = buildSesionHeuristicaPdfDefinition(sesion, [h({ id: 'a', titulo: 'Grave', severidad: 4 }), h({ id: 'b', titulo: 'Leve', severidad: 1 })], new Map(), AHORA);
    const s = texto(def.content);
    expect(s).toContain('Portal de matrículas');
    expect(s).toContain('Finalizada el');
    expect(s.indexOf('1. Grave')).toBeGreaterThan(-1);
    expect(s.indexOf('1. Grave')).toBeLessThan(s.indexOf('2. Leve'));
    expect(s).toContain('Severidad 4 · Catastrófico');
    expect(s).toContain('Ana Evaluadora');
    expect(def.info?.title).toBe('Evaluación heurística · Portal de matrículas');
  });

  it('marca la sesión abierta como borrador', () => {
    const def = buildSesionHeuristicaPdfDefinition({ ...sesion, estado: 'EN_PROGRESO', completadoAt: null }, [], new Map(), AHORA);
    expect(texto(def.content)).toContain('En progreso (borrador)');
    expect(texto(def.content)).toContain('todavía no contiene hallazgos');
  });

  it('tolera un hallazgo legado sin título, responsable ni campos nuevos', () => {
    const legado: HallazgoHeuristica = { id: 'c', heuristicaId: 'consistencia', severidad: 2, descripcion: 'Legado', evidencia: null, recomendacion: null, registradoEn: '2026-09-01T00:00:00.000Z' };
    const s = texto(buildSesionHeuristicaPdfDefinition(sesion, [legado], new Map(), AHORA).content);
    expect(s).toContain('1. consistencia');
    expect(s).toContain('Responsable: Sin registrar');
    expect(s).toContain('Legado');
  });

  it('incrusta la captura cargada y deja un aviso si no se pudo cargar', () => {
    const capturas = new Map<string, string | null>([['f1', 'data:image/png;base64,AAA'], ['f2', null]]);
    const def = buildSesionHeuristicaPdfDefinition(sesion, [h({ id: 'a', evidenciaArchivoId: 'f1' }), h({ id: 'b', evidenciaArchivoId: 'f2' })], capturas, AHORA);
    expect(def.images).toMatchObject({ 'cap-f1': 'data:image/png;base64,AAA' });
    expect(def.images).not.toHaveProperty('cap-f2');
    const s = texto(def.content);
    expect(s).toContain('"image":"cap-f1"');
    expect(s).toContain('Captura adjunta en la aplicación');
  });

  it('solo enlaza URLs http(s); otro esquema va como texto sin link', () => {
    const buena = texto(buildSesionHeuristicaPdfDefinition(sesion, [h({ evidenciaUrl: 'https://sitio.cl/a' })], new Map(), AHORA).content);
    expect(buena).toContain('"link":"https://sitio.cl/a"');
    const mala = texto(buildSesionHeuristicaPdfDefinition(sesion, [h({ evidenciaUrl: 'javascript:alert(1)' })], new Map(), AHORA).content);
    expect(mala).toContain('javascript:alert(1)');
    expect(mala).not.toContain('"link"');
  });
});

describe('cargarCapturas', () => {
  const conCaptura = (n: number) => Array.from({ length: n }, (_, i) => h({ id: `h${i}`, evidenciaArchivoId: `f${i}` }));

  it('descarga como máximo el tope de capturas', async () => {
    vi.mocked(obtenerEvidenciaBlob).mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    const capturas = await cargarCapturas('p1', 's1', conCaptura(MAX_CAPTURAS_PDF + 5));
    expect(capturas.size).toBe(MAX_CAPTURAS_PDF);
    expect(obtenerEvidenciaBlob).toHaveBeenCalledTimes(MAX_CAPTURAS_PDF);
    expect(capturas.get('f0')).toMatch(/^data:image\/png;base64,/);
  });

  it('una captura que falla queda en null y no aborta las demás', async () => {
    vi.mocked(obtenerEvidenciaBlob)
      .mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce(new Blob(['x'], { type: 'image/jpeg' }));
    const capturas = await cargarCapturas('p1', 's1', conCaptura(2));
    expect(capturas.get('f0')).toBeNull();
    expect(capturas.get('f1')).toMatch(/^data:image\/jpeg;base64,/);
  });
});

describe('slugArchivo', () => {
  it('quita tildes y símbolos y nunca queda vacío', () => {
    expect(slugArchivo('Portal de matrículas / 2026')).toBe('evaluacion-heuristica-portal-de-matriculas-2026.pdf');
    expect(slugArchivo('???')).toBe('evaluacion-heuristica-sesion.pdf');
  });
});
