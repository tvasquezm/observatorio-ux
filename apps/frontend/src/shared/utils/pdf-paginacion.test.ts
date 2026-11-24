// Los informes PDF no deben dejar bloques cortados entre hojas: se renderizan con datos
// extensos (textos largos, varias capturas, muchas fases y tarjetas) y se revisa cada bloque.
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { ConfiguracionFlujo, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { construirInformeFlujoPdf } from '../../features/heuristica-flujo/informe-pdf';
import { cuerpoVista } from '../../features/card-sorting/card-sorting-pdf-content';
import { buildReportDefinition, type ReportConImagenes } from './pdf';
import { PDF_PAGE_MARGINS } from './pdf-base';
import { bloquesQueNoCaben } from './pdf-paginacion';

/** PNG apaisado (16:9) de un color, como una captura de pantalla. */
function png(ancho = 32, alto = 18): string {
  const crcTabla = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTabla[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const bloque = (tipo: string, datos: Buffer) => { const t = Buffer.concat([Buffer.from(tipo), datos]); const l = Buffer.alloc(4); l.writeUInt32BE(datos.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(t)); return Buffer.concat([l, t, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4); ihdr[8] = 8; ihdr[9] = 2;
  const filas = Buffer.concat(Array.from({ length: alto }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(ancho * 3, 0x88)])));
  return `data:image/png;base64,${Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloque('IHDR', ihdr), bloque('IDAT', deflateSync(filas)), bloque('IEND', Buffer.alloc(0))]).toString('base64')}`;
}

const largo = (n: number) => Array.from({ length: n }, (_, i) => `Frase ${i + 1} con detalle de lo observado durante la prueba.`).join(' ');
const config: ConfiguracionFlujo = { nombre: 'Portal de matrícula', producto: { clave: 'portal', nombre: 'Portal', version: 'v1', url: 'https://ejemplo.cl', dispositivo: 'Web' }, objetivo: 'Matricular', tareas: 'Guardar formulario', pantallas: 'Inscripción', exclusiones: 'Pagos', metodologia: METODOLOGIAS_HEURISTICAS[0], evaluadorIds: ['u1'], lectorIds: [] };

function evaluacion(): EvaluacionFlujo {
  const criterio = config.metodologia.criterios[0].id;
  const hallazgos = Array.from({ length: 4 }, (_, i) => ({
    id: `f${i}`, criterioIds: [criterio], titulo: `Problema ${i + 1} al guardar`, pantalla: 'Inscripción', descripcion: largo(i === 3 ? 30 : 5), recomendacion: largo(3),
    severidad: (4 - (i % 4)) as 1 | 2 | 3 | 4, prioridad: 'ALTA' as const, notas: i ? '' : largo(2), evidenciaIds: i === 3 ? ['c3a'] : [`c${i}a`, `c${i}b`], origenIds: ['o1'], decision: 'ACEPTADO' as const, justificacion: largo(2),
  }));
  const consenso = {
    criterios: config.metodologia.criterios.map(c => ({ criterioId: c.id, valor: config.metodologia.escala.niveles[0].id, noAplica: false, motivo: '', notas: '', justificacion: 'Revisado' })),
    hallazgos, aprobadoPor: ['u1'],
    positivos: [{ id: 'p1', titulo: 'Menú claro', descripcion: largo(3), evidenciaIds: ['cp1'] }, { id: 'p2', titulo: 'Buen contraste', descripcion: largo(2), evidenciaIds: [] }],
    mejoras: [{ id: 'm1', titulo: 'Botón visible', descripcion: largo(2), antesIds: ['ma'], despuesIds: ['md'] }],
    conclusion: largo(6),
  };
  const informe = { version: 1, configuracion: config, consenso, evaluadores: [{ id: 'u1', nombre: 'Ana' }], iniciadoEn: '2026-10-09', consolidadoEn: '2026-10-09', finalizadoEn: '2026-10-09' };
  return { id: 'e1', proyectoId: 'p1', coordinadorId: 'u1', revision: 1, version: 1, anteriorId: null, fase: 'FINALIZADA', configuracion: config, trabajos: [], consenso, informe, comparacion: null, createdAt: '2026-10-09', updatedAt: '2026-10-09', iniciadoEn: '2026-10-09', consolidadoEn: '2026-10-09', finalizadoEn: '2026-10-09' } as unknown as EvaluacionFlujo;
}
const idsCapturas = ['c3a', 'c0a', 'c0b', 'c1a', 'c1b', 'c2a', 'c2b', 'cp1', 'ma', 'md'];

function reporteGeneral(): ReportConImagenes {
  const ev = evaluacion();
  const fases = Array.from({ length: 7 }, (_, i) => ({ nombre: `Fase ${i + 1}`, emocion: (['Positiva', 'Neutral', 'Negativa'] as const)[i % 3], actividades: [largo(2)], touchpoints: ['Portal', 'Correo'], pensamientos: largo(1), dificultades: [largo(2)], ganancias: [largo(1)], oportunidades: [largo(1)] }));
  return {
    project: { id: 'p1', nombre: 'Investigación móvil', descripcion: largo(2) }, generatedAt: new Date('2026-11-24T12:00:00Z'),
    methods: [{ id: 'personas', label: 'Personas', detail: 'Fichas' }, { id: 'journey', label: 'Journey Map', detail: 'Recorridos' }, { id: 'momentos', label: 'Momentos críticos', detail: 'Incidentes' }, { id: 'heuristica', label: 'Evaluación heurística', detail: 'Hallazgos' }],
    personas: [0, 1].map(i => ({ version: 1, contenido: { nombreCompleto: `Persona ${i + 1}`, edad: 21, ocupacion: 'Estudiante', acercaDe: largo(3), objetivos: [largo(2)], necesidades: [largo(2)], motivaciones: [largo(2)], frustraciones: [largo(2)], comportamientos: [largo(2)], contextoDeUso: largo(2), familia: largo(1), hobbies: 'Leer', habilidades: 'Digital', expectativas: largo(2), evidencia: largo(2), estadoValidacion: 'VALIDADA' } })),
    journeys: [{ version: 1, contenido: { perfilUsuario: { nombre: 'Camila', rol: 'Estudiante' }, objetivo: largo(1), eventoInicio: 'Abre el portal', evidencia: largo(1), fases } }],
    moments: [0, 1].map(i => ({ version: 1, contenido: { perfilUsuario: { nombre: `Perfil ${i + 1}`, rol: 'Estudiante' }, incidentes: Array.from({ length: 5 }, (_, k) => ({ nombre: `Incidente ${k + 1}`, tipo: 'Negativo', impacto: 'Alto', frecuencia: 'Frecuente', descripcion: largo(4), causa: largo(2), accionesSugeridas: largo(3) })) } })),
    heuristics: [ev, { ...ev, id: 'e2' }],
    imagenes: Object.fromEntries(['e1', 'e2'].flatMap(e => idsCapturas.map(id => [`captura-${e}-${id}`, png()]))),
    piesCapturas: {},
  } as unknown as ReportConImagenes;
}

function documento(content: TDocumentDefinitions['content'], orientacion: 'portrait' | 'landscape'): TDocumentDefinitions {
  return { pageSize: 'A4', pageOrientation: orientacion, pageMargins: PDF_PAGE_MARGINS, content };
}

describe('Paginación de los informes PDF', () => {
  it('el detector reconoce un bloque más alto que la hoja', async () => {
    const lineas = Array.from({ length: 80 }, (_, i) => ({ text: `Línea ${i}` }));
    const { cortados } = await bloquesQueNoCaben(documento([{ stack: lineas, unbreakable: true }, { image: png(), fit: [400, 300] }], 'landscape'));
    expect(cortados).toHaveLength(1);
  }, 30_000);

  it('informe de la evaluación heurística: ningún bloque ni captura queda cortado', async () => {
    const capturas = new Map(idsCapturas.map(id => [id, png()]));
    const { cortados: cortes, revisados } = await bloquesQueNoCaben(construirInformeFlujoPdf(evaluacion(), capturas, new Date('2026-11-24T12:00:00Z')));
    expect(revisados).toBeGreaterThan(5);
    expect(cortes).toEqual([]);
  }, 60_000);

  it('cada problema de la evaluación heurística abre hoja propia en ambos informes', () => {
    const conSalto = (contenido: unknown) => (contenido as Array<{ pageBreak?: string }>).filter(n => n.pageBreak === 'before' && JSON.stringify(n).includes('al guardar'));
    const capturas = new Map(idsCapturas.map(id => [id, png()]));
    expect(conSalto(construirInformeFlujoPdf(evaluacion(), capturas, new Date()).content)).toHaveLength(4);
    expect(conSalto(buildReportDefinition(reporteGeneral()).content)).toHaveLength(8);
  });

  it('informe general del proyecto: ningún bloque ni captura queda cortado', async () => {
    const { cortados: cortes, revisados } = await bloquesQueNoCaben(buildReportDefinition(reporteGeneral()));
    expect(revisados).toBeGreaterThan(5);
    expect(cortes).toEqual([]);
  }, 60_000);

  it('dendrograma: cabe entero en la hoja; con demasiadas tarjetas remite al CSV en vez de cortarse', async () => {
    const tabla = (n: number) => {
      const tarjetas = Array.from({ length: n }, (_, i) => `Tarjeta ${i + 1}`);
      const similitud = tarjetas.map((_, i) => tarjetas.map((__, j) => (i === j ? 100 : 100 - Math.abs(i - j))));
      return { vista: 'dendrogram', titulo: 'Dendrograma', descripcion: 'desc', columnas: ['a'], filas: [['x']], grafico: { tipo: 'dendrograma', tarjetas, similitud } } as unknown as Parameters<typeof cuerpoVista>[0];
    };
    for (const [orientacion, apaisada, maximo] of [['portrait', false, 83], ['landscape', true, 48]] as const) {
      const { cortados, revisados } = await bloquesQueNoCaben(documento([{ text: 'Dendrograma', fontSize: 19 }, { text: 'Descripción' }, ...cuerpoVista(tabla(maximo), apaisada)], orientacion));
      expect(revisados, orientacion).toBeGreaterThan(0);
      expect(cortados, orientacion).toEqual([]);
      expect(JSON.stringify(cuerpoVista(tabla(maximo + 1), apaisada)), orientacion).toContain('no cabe legible en una hoja');
    }
  }, 60_000);
});
