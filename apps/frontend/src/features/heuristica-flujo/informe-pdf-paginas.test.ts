import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ConfiguracionFlujo, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import { HOJA_APAISADA, bloquesInformeFlujo, construirInformeFlujoPdf } from './informe-pdf';
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES, keepHeadingsWithContent } from '../../shared/utils/pdf-base';

// PNG de 1x1 píxel: pdfmake lo ajusta al recuadro pedido, así que sirve de captura para medir el diseño.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const config: ConfiguracionFlujo = { nombre: 'Informe', producto: { clave: 'portal', nombre: 'Portal', version: 'v1', url: 'https://ejemplo.cl', dispositivo: 'Web' }, objetivo: 'Matricular', tareas: 'Guardar', pantallas: 'Inscripción', exclusiones: '', metodologia: { ...METODOLOGIAS_HEURISTICAS[0], criterios: METODOLOGIAS_HEURISTICAS[0].criterios.slice(0, 3) }, evaluadorIds: ['u1', 'u2'], lectorIds: [] };

function hallazgo(i: number, texto: string, capturas: number) {
  return { id: `f${i}`, criterioIds: [config.metodologia.criterios[i % 3].id], titulo: `Problema ${i + 1}`, pantalla: 'Inscripción', descripcion: texto, recomendacion: texto.slice(0, 400), severidad: 3 as const, prioridad: 'ALTA' as const, notas: '', evidenciaIds: Array.from({ length: capturas }, (_, k) => `c${i}-${k}`), origenIds: [`o${i}`], decision: 'ACEPTADO' as const, justificacion: 'Se verificó.' };
}

function evaluacion(hallazgos: ReturnType<typeof hallazgo>[]): EvaluacionFlujo {
  const consenso = { criterios: config.metodologia.criterios.map(c => ({ criterioId: c.id, valor: config.metodologia.escala.niveles[0].id, noAplica: false, motivo: '', notas: '', justificacion: 'Revisión confirmada' })), hallazgos, aprobadoPor: ['u1', 'u2'] };
  return { id: 'e1', proyectoId: 'p1', coordinadorId: 'u1', revision: 5, version: 1, anteriorId: null, fase: 'FINALIZADA', configuracion: config, trabajos: [], consenso, informe: { version: 1, configuracion: config, consenso, evaluadores: [{ id: 'u1', nombre: 'Ana' }, { id: 'u2', nombre: 'Beto' }], iniciadoEn: '2026-10-09', consolidadoEn: '2026-10-09', finalizadoEn: '2026-10-09' }, comparacion: null, createdAt: '2026-10-09', updatedAt: '2026-10-09', iniciadoEn: '2026-10-09', consolidadoEn: '2026-10-09', finalizadoEn: '2026-10-09' } as unknown as EvaluacionFlujo;
}

/** Genera el PDF sin comprimir y devuelve, por página, si trae texto o imágenes (false = hoja en blanco). */
async function paginasConContenido(ev: EvaluacionFlujo, capturas: Map<string, string | null>): Promise<boolean[]> {
  return paginasDe({ ...construirInformeFlujoPdf(ev, capturas, new Date('2026-11-01T12:00:00Z')) });
}

async function paginasDe(definicion: object): Promise<boolean[]> {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfMake = ((pdfMakeModule as unknown as { default: unknown }).default ?? pdfMakeModule) as { addVirtualFileSystem: (v: unknown) => void; addFonts: (f: unknown) => void; createPdf: (d: unknown) => { getBuffer: () => Promise<Uint8Array> } };
  // Las mismas fuentes que carga la aplicación (public/fonts), leídas desde el disco.
  const archivos = ['lmroman10-regular.otf', 'lmroman10-bold.otf', 'lmroman10-italic.otf', 'lmroman10-bolditalic.otf'];
  pdfMake.addVirtualFileSystem(Object.fromEntries(archivos.map(f => [f, readFileSync(resolve(process.cwd(), 'public/fonts', f)).toString('base64')])));
  pdfMake.addFonts({ LatinModern: { normal: archivos[0], bold: archivos[1], italics: archivos[2], bolditalics: archivos[3] } });
  const doc = { ...definicion, compress: false };
  const texto = Buffer.from(await pdfMake.createPdf(doc).getBuffer()).toString('latin1');
  const objetos = new Map<string, string>();
  for (const m of texto.matchAll(/(?:^|\n)(\d+) 0 obj\n([\s\S]*?)\nendobj/g)) objetos.set(m[1], m[2]);
  const paginas = [...objetos.values()].filter(o => /\/Type \/Page\b(?!s)/.test(o));
  return paginas.map(p => {
    const ref = /\/Contents (\d+) 0 R/.exec(p)?.[1];
    const flujo = ref ? objetos.get(ref) ?? '' : '';
    return /\bBT\b/.test(flujo) || /\bDo\b/.test(flujo);
  });
}

describe('Informe PDF: sin hojas en blanco', () => {
  const largo = 'El formulario no explica qué ocurre al guardar y la persona queda sin saber si se registró su inscripción. '.repeat(6);
  const casos: Array<[string, number[], string]> = [
    ['hallazgos cortos sin captura', [0, 0, 0, 0], 'Texto breve.'],
    ['hallazgos con una captura', [1, 1, 1, 1, 1], 'Texto breve.'],
    ['hallazgos largos con tres capturas', [3, 3, 3], largo],
    ['hallazgos muy largos', [2, 2], largo.repeat(6)],
  ];
  it.each(casos)('%s', async (_nombre, capturasPorHallazgo, texto) => {
    const hallazgos = capturasPorHallazgo.map((n, i) => hallazgo(i, texto, n));
    const capturas = new Map<string, string | null>(hallazgos.flatMap(h => h.evidenciaIds.map(id => [id, PNG] as [string, string])));
    const paginas = await paginasConContenido(evaluacion(hallazgos), capturas);
    expect(paginas.length).toBeGreaterThan(0);
    expect(paginas.filter(p => !p).length, `hojas en blanco: ${paginas.map(p => (p ? 'x' : '·')).join('')}`).toBe(0);
  }, 60_000);

  it('una captura que no pudo cargarse deja el aviso en vez de una hoja vacía', async () => {
    const hallazgos = [hallazgo(0, 'Texto breve.', 2)];
    const capturas = new Map<string, string | null>([['c0-0', null], ['c0-1', PNG]]);
    const paginas = await paginasConContenido(evaluacion(hallazgos), capturas);
    expect(paginas.every(Boolean)).toBe(true);
  }, 60_000);

  it('el detector sí reconoce una hoja en blanco', async () => {
    const paginas = await paginasDe({ pageSize: 'A4', defaultStyle: { font: 'LatinModern' }, content: [{ text: 'Primera' }, { text: '', pageBreak: 'before' }, { text: 'Tercera', pageBreak: 'before' }] });
    expect(paginas).toHaveLength(3);
    expect(paginas.filter(p => !p)).toHaveLength(1);
  });

  it('dentro del informe general (hoja apaisada) tampoco quedan hojas en blanco y trae lo mismo que el informe propio', async () => {
    const hallazgos = [0, 1, 2, 3].map(i => hallazgo(i, largo, i % 3));
    const ev = evaluacion(hallazgos);
    const capturas = new Map<string, string | null>(hallazgos.flatMap(h => h.evidenciaIds.map(id => [id, PNG] as [string, string])));
    const { content, images } = bloquesInformeFlujo(ev, capturas, new Date('2026-11-01T12:00:00Z'), { integrado: true }, HOJA_APAISADA, 'captura-e1-');
    const texto = JSON.stringify(content);
    for (const esperado of ['Problema 1', 'Origen', 'Revisión', 'Decidido por', 'Cobertura y resultados']) expect(texto).toContain(esperado);
    const paginas = await paginasDe({ pageSize: 'A4', pageOrientation: 'landscape', pageMargins: PDF_PAGE_MARGINS, defaultStyle: PDF_DEFAULT_STYLE, images, content, styles: PDF_STYLES, pageBreakBefore: keepHeadingsWithContent });
    expect(paginas.length).toBeGreaterThan(3);
    expect(paginas.filter(p => !p).length, `hojas en blanco: ${paginas.map(p => (p ? 'x' : '·')).join('')}`).toBe(0);
  }, 60_000);
});
