import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildReportDefinition, type ReportConImagenes } from './pdf';

/** Genera el PDF sin comprimir y devuelve, por página, si trae texto o imágenes (false = hoja en blanco). */
async function paginasConContenido(definicion: object): Promise<boolean[]> {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfMake = ((pdfMakeModule as unknown as { default: unknown }).default ?? pdfMakeModule) as { addVirtualFileSystem: (v: unknown) => void; addFonts: (f: unknown) => void; createPdf: (d: unknown) => { getBuffer: () => Promise<Uint8Array> } };
  const archivos = ['lmroman10-regular.otf', 'lmroman10-bold.otf', 'lmroman10-italic.otf', 'lmroman10-bolditalic.otf'];
  pdfMake.addVirtualFileSystem(Object.fromEntries(archivos.map(f => [f, readFileSync(resolve(process.cwd(), 'public/fonts', f)).toString('base64')])));
  pdfMake.addFonts({ LatinModern: { normal: archivos[0], bold: archivos[1], italics: archivos[2], bolditalics: archivos[3] } });
  const texto = Buffer.from(await pdfMake.createPdf({ ...definicion, compress: false }).getBuffer()).toString('latin1');
  const objetos = new Map<string, string>();
  for (const m of texto.matchAll(/(?:^|\n)(\d+) 0 obj\n([\s\S]*?)\nendobj/g)) objetos.set(m[1], m[2]);
  return [...objetos.values()].filter(o => /\/Type \/Page\b(?!s)/.test(o)).map(p => {
    const ref = /\/Contents (\d+) 0 R/.exec(p)?.[1];
    const flujo = ref ? objetos.get(ref) ?? '' : '';
    return /\bBT\b/.test(flujo) || /\bDo\b/.test(flujo);
  });
}

const largo = 'La persona abandona el trámite porque no entiende qué documento debe adjuntar y vuelve a empezar varias veces. '.repeat(5);
const lista = (n: number, base: string) => Array.from({ length: n }, (_, i) => `${base} ${i + 1}: ${largo.slice(0, 160)}`);

function informe(personas: number, fases: number, incidentes: number): ReportConImagenes {
  const persona = (i: number) => ({ version: 2, contenido: { nombreCompleto: `Persona ${i + 1}`, edad: 24, ocupacion: 'Estudiante', acercaDe: largo, objetivos: lista(4, 'Objetivo'), necesidades: lista(4, 'Necesidad'), frustraciones: lista(5, 'Frustración'), motivaciones: lista(3, 'Motivación'), comportamientos: lista(3, 'Comportamiento'), contextoDeUso: largo, evidencia: lista(3, 'Entrevista'), estadoValidacion: 'VALIDADA' } });
  const journey = (i: number) => ({ version: 1, contenido: { perfilUsuario: { nombre: `Persona ${i + 1}`, rol: 'Estudiante' }, objetivo: largo, eventoInicio: 'Abre el portal', evidencia: lista(2, 'Fuente'), fases: Array.from({ length: fases }, (_, k) => ({ nombre: `Fase ${k + 1}`, emocion: (['Positiva', 'Neutral', 'Negativa'] as const)[k % 3], actividades: lista(3, 'Actividad'), touchpoints: lista(2, 'Canal'), pensamientos: largo, dificultades: lista(4, 'Dificultad'), ganancias: lista(2, 'Ganancia'), oportunidades: lista(3, 'Oportunidad') })) } });
  const momento = (i: number) => ({ version: 1, contenido: { perfilUsuario: { nombre: `Persona ${i + 1}`, rol: 'Estudiante' }, incidentes: Array.from({ length: incidentes }, (_, k) => ({ nombre: `Incidente ${k + 1}`, tipo: k % 2 ? 'Positivo' : 'Negativo', impacto: 'Alto', frecuencia: 'Media', descripcion: largo, causa: largo, accionesSugeridas: lista(3, 'Acción') })) } });
  return {
    project: { id: 'p1', nombre: 'Portal de matrícula', descripcion: 'Proyecto de prueba' },
    generatedAt: new Date('2026-11-01T12:00:00Z'),
    methods: [
      { id: 'personas', label: 'Personas', detail: 'Perfiles' }, { id: 'journey', label: 'Journey Map', detail: 'Fases' },
      { id: 'momentos', label: 'Momentos Críticos', detail: 'Incidentes' },
    ],
    personas: Array.from({ length: personas }, (_, i) => persona(i)),
    journeys: Array.from({ length: personas }, (_, i) => journey(i)),
    moments: Array.from({ length: personas }, (_, i) => momento(i)),
    cards: [], heuristics: [], partes: {}, imagenes: {}, piesCapturas: {},
  } as unknown as ReportConImagenes;
}

describe('Informe general: personas, journey maps y momentos críticos', () => {
  it.each([[1, 3, 3], [2, 4, 6], [2, 7, 12]])('%i personas, %i fases y %i incidentes no dejan hojas en blanco', async (personas, fases, incidentes) => {
    const paginas = await paginasConContenido(buildReportDefinition(informe(personas, fases, incidentes)));
    expect(paginas.length).toBeGreaterThan(3);
    expect(paginas.filter(p => !p).length, `hojas en blanco: ${paginas.map(p => (p ? 'x' : '·')).join('')}`).toBe(0);
  }, 120_000);
});
