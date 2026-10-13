// PDF de una evaluación heurística: resumen + un bloque por hallazgo, con su captura.
// Mismo patrón que card-sorting-pdf.ts (pdfmake cargado bajo demanda, marca compartida).

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { SEVERIDADES } from '@observatorio-ux/shared-types';
import { brandChrome, cargarPdfMake, date, INK, MUTED, TEAL, table, type ReportBrand } from '../../shared/utils/pdf';
import {
  obtenerEvidenciaBlob,
  type EvaluacionHeuristicaSesion,
  type HallazgoHeuristica,
} from './api/evaluacion-heuristica.api';
import {
  FILTROS_INICIALES,
  esUrlHttp,
  etiquetaHeuristica,
  filtrarYOrdenar,
  nombreSesion,
  severidadInfo,
} from './heuristica-utils';
import { resumirSesion } from './heuristica-resumen';

/** Tope de capturas incrustadas: cada una puede pesar hasta 2 MB y pdfmake las codifica en memoria. */
export const MAX_CAPTURAS_PDF = 30;

const COLOR_SEVERIDAD = ['#526a73', '#526a73', '#85601b', '#a44626', '#922f3d'];

export type CapturasPdf = Map<string, string | null>;

function eyebrow(text: string): Content {
  return { text, style: 'eyebrow', margin: [0, 14, 0, 6] };
}

function campo(label: string, value: string | null | undefined): Content[] {
  const texto = value?.trim();
  if (!texto) return [];
  return [{ text: label.toUpperCase(), style: 'eyebrow', fontSize: 7, margin: [0, 6, 0, 1] }, { text: texto }];
}

function bloqueHallazgo(h: HallazgoHeuristica, n: number, capturas: CapturasPdf): Content {
  const info = severidadInfo(h.severidad);
  const url = h.evidenciaUrl?.trim();
  const dataUrl = h.evidenciaArchivoId ? capturas.get(h.evidenciaArchivoId) : undefined;
  const nombreImagen = h.evidenciaArchivoId ? `cap-${h.evidenciaArchivoId}` : null;

  const imagen: Content[] = !h.evidenciaArchivoId
    ? []
    : dataUrl && nombreImagen
      ? [{ text: 'CAPTURA DE PANTALLA', style: 'eyebrow', fontSize: 7, margin: [0, 8, 0, 3] }, { image: nombreImagen, fit: [440, 260] }]
      : [{ text: 'Captura adjunta en la aplicación (no incluida en este PDF).', italics: true, color: MUTED, margin: [0, 8, 0, 0] }];

  return {
    unbreakable: true,
    margin: [0, 0, 0, 14],
    stack: [
      { text: `${n}. ${h.titulo?.trim() || etiquetaHeuristica(h.heuristicaId)}`, fontSize: 12, bold: true },
      { text: `Severidad ${info.valor} · ${info.etiqueta}`, bold: true, color: COLOR_SEVERIDAD[info.valor], margin: [0, 2, 0, 0] },
      {
        text: [
          etiquetaHeuristica(h.heuristicaId),
          ...(h.pantalla?.trim() ? [` · Pantalla: ${h.pantalla.trim()}`] : []),
          ` · Responsable: ${h.responsable?.nombre ?? 'Sin registrar'} · ${date(h.registradoEn)}`,
        ].join(''),
        color: MUTED, fontSize: 8.5, margin: [0, 2, 0, 0],
      },
      ...campo('Descripción', h.descripcion),
      ...campo('Evidencia', h.evidencia),
      ...(url ? [{ text: 'ENLACE', style: 'eyebrow', fontSize: 7, margin: [0, 6, 0, 1] } as Content, esUrlHttp(url) ? { text: url, link: url, color: TEAL, decoration: 'underline' as const } : { text: url }] : []),
      ...campo('Recomendación', h.recomendacion),
      ...imagen,
    ],
  };
}

export function buildSesionHeuristicaPdfDefinition(
  sesion: Pick<EvaluacionHeuristicaSesion, 'nombre' | 'createdAt' | 'estado' | 'completadoAt'>,
  hallazgosOrdenados: HallazgoHeuristica[],
  capturas: CapturasPdf,
  generatedAt: Date,
  brand?: ReportBrand,
): TDocumentDefinitions {
  const resumen = resumirSesion(hallazgosOrdenados);
  const nombre = nombreSesion(sesion);
  const abierta = sesion.estado !== 'COMPLETADO';
  const conteo = SEVERIDADES.map((s) => hallazgosOrdenados.filter((h) => h.severidad === s.valor).length);

  const imagenes: Record<string, string> = {};
  for (const [id, dataUrl] of capturas) if (dataUrl) imagenes[`cap-${id}`] = dataUrl;

  const estadisticas: Array<[string, string]> = [
    ['Hallazgos', String(resumen.total)],
    ['Mayores o catastróficos', String(resumen.criticos)],
    ['Severidad promedio', resumen.promedio === null ? '—' : String(resumen.promedio).replace('.', ',')],
    ['Sin evidencia', String(resumen.sinEvidencia)],
  ];

  return {
    info: { title: `Evaluación heurística · ${nombre}`, subject: 'Evaluación heurística', creator: 'UXLab Observatorio' },
    pageSize: 'A4', pageMargins: [44, 66, 44, 54],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.2, color: INK },
    images: { ...(brand ? { brandLogo: brand.logo, brandLogoWhite: brand.logoWhite } : {}), ...imagenes },
    ...brandChrome(brand, 'EVALUACIÓN HEURÍSTICA', generatedAt),
    content: [
      { text: 'EVALUACIÓN HEURÍSTICA', style: 'eyebrow', margin: [0, 116, 0, 12] },
      { text: nombre, fontSize: 28, bold: true, lineHeight: 1.08, margin: [0, 0, 0, 14] },
      {
        text: `${abierta ? 'En progreso (borrador)' : `Finalizada${sesion.completadoAt ? ` el ${date(sesion.completadoAt)}` : ''}`} · Exportado el ${date(generatedAt)}`,
        color: MUTED, margin: [0, 0, 0, 14],
      },
      { columns: estadisticas.map(([label, value]) => ({ stack: [{ text: label.toUpperCase(), style: 'eyebrow', fontSize: 7 }, { text: value, bold: true, margin: [0, 4, 0, 0] }] })), margin: [0, 0, 0, 6] },
      eyebrow('SEVERIDAD'),
      table(['Severidad', 'Hallazgos'], SEVERIDADES.slice().reverse().map((s) => [`${s.valor} · ${s.etiqueta}`, conteo[s.valor]]), ['*', 90]),
      ...(resumen.porHeuristica.length
        ? [eyebrow('HEURÍSTICAS'), table(['Heurística', 'Hallazgos'], resumen.porHeuristica.map((p) => [etiquetaHeuristica(p.heuristicaId), p.count]), ['*', 90])]
        : []),
      ...(resumen.porResponsable.length
        ? [eyebrow('RESPONSABLES'), table(['Responsable', 'Hallazgos'], resumen.porResponsable.map((p) => [p.nombre, p.count]), ['*', 90])]
        : []),
      { text: 'HALLAZGOS', style: 'eyebrow', pageBreak: 'before', margin: [0, 0, 0, 10] },
      ...(hallazgosOrdenados.length
        ? hallazgosOrdenados.map((h, i) => bloqueHallazgo(h, i + 1, capturas))
        : [{ text: 'Esta evaluación todavía no contiene hallazgos.', color: MUTED, italics: true } as Content]),
    ],
    styles: { eyebrow: { fontSize: 9, bold: true, color: TEAL, characterSpacing: 1 } },
  };
}

/** pdfmake solo incrusta PNG y JPEG: las capturas WebP se convierten a PNG con un canvas. */
async function blobADataUrl(blob: Blob): Promise<string> {
  if (blob.type === 'image/png' || blob.type === 'image/jpeg') {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(new Error('lectura'));
      lector.readAsDataURL(blob);
    });
  }
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL('image/png');
}

export function slugArchivo(nombre: string): string {
  const slug = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return `evaluacion-heuristica-${slug || 'sesion'}.pdf`;
}

/** Descarga las capturas de los primeros hallazgos (hasta el tope); una que falle no aborta el PDF. */
export async function cargarCapturas(proyectoId: string, sesionId: string, ordenados: HallazgoHeuristica[]): Promise<CapturasPdf> {
  const capturas: CapturasPdf = new Map();
  const ids = [...new Set(ordenados.flatMap((h) => (h.evidenciaArchivoId ? [h.evidenciaArchivoId] : [])))].slice(0, MAX_CAPTURAS_PDF);
  for (const id of ids) {
    try {
      capturas.set(id, await blobADataUrl(await obtenerEvidenciaBlob(proyectoId, sesionId, id)));
    } catch {
      capturas.set(id, null);
    }
  }
  return capturas;
}

export async function exportarSesionHeuristicaPdf(proyectoId: string, sesion: EvaluacionHeuristicaSesion): Promise<{ sinCaptura: number }> {
  const ordenados = filtrarYOrdenar([...sesion.resultado], FILTROS_INICIALES);
  const [{ pdfMake, brand }, capturas] = await Promise.all([cargarPdfMake(), cargarCapturas(proyectoId, sesion.id, ordenados)]);
  const sinCaptura = ordenados.filter((h) => h.evidenciaArchivoId && !capturas.get(h.evidenciaArchivoId)).length;
  await pdfMake
    .createPdf(buildSesionHeuristicaPdfDefinition(sesion, ordenados, capturas, new Date(), brand))
    .download(slugArchivo(nombreSesion(sesion)));
  return { sinCaptura };
}
