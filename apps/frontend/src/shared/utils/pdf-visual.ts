// F40: Personas y Journey Map en el PDF "como en la página": tarjeta de la persona
// y tablero por fases con la curva de emociones. El desglose en tablas se mantiene aparte.
import type { Content, TableCell } from 'pdfmake/interfaces';
import { CURVA_ALTO, CURVA_ANCHO_FASE, puntosCurva, trazoCurva } from '../../features/journey-map/journey-visual';
import { INK, MUTED, TEAL, textValue } from './pdf-base';

type Emocion = 'Positiva' | 'Neutral' | 'Negativa';
const COLOR_EMOCION: Record<Emocion, string> = { Positiva: '#2f8f5b', Neutral: '#b7861c', Negativa: '#c0392b' };
const FONDO_EMOCION: Record<Emocion, string> = { Positiva: '#e6f4ec', Neutral: '#fbf2dc', Negativa: '#fbe4e1' };

const iniciales = (nombre: string) => nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase() || '?';
/** pdfmake solo incrusta PNG y JPEG en data URL; otras fotos se reemplazan por las iniciales. */
const fotoIncrustable = (url?: string) => !!url && /^data:image\/(png|jpeg);base64,/.test(url);
const lista = (v: unknown) => textValue(v);

function caja(titulo: string, valor: unknown, fondo: string): TableCell {
  return { stack: [{ text: titulo.toUpperCase(), style: 'eyebrow', fontSize: 7, margin: [0, 0, 0, 3] }, { text: lista(valor), fontSize: 9 }], fillColor: fondo, margin: [6, 6, 6, 6] };
}

interface PersonaPdf {
  nombreCompleto: string; edad?: unknown; ocupacion?: string; fotografiaUrl?: string; acercaDe?: unknown;
  objetivos?: unknown; necesidades?: unknown; frustraciones?: unknown; motivaciones?: unknown; comportamientos?: unknown; contextoDeUso?: unknown;
}

export function personaVisual(p: PersonaPdf): Content[] {
  const avatar: Content = fotoIncrustable(p.fotografiaUrl)
    ? { image: p.fotografiaUrl!, fit: [86, 86] }
    : { table: { widths: [70], heights: [70], body: [[{ text: iniciales(p.nombreCompleto), fontSize: 24, bold: true, color: '#ffffff', alignment: 'center', fillColor: TEAL, margin: [0, 20, 0, 0] }]] }, layout: 'noBorders' };
  const subtitulo = [p.ocupacion, p.edad ? `${p.edad} años` : ''].filter(Boolean).join(' · ');
  return [
    { columns: [
      { width: 96, stack: [avatar] },
      { width: '*', stack: [
        { text: p.nombreCompleto, fontSize: 18, bold: true, color: INK },
        ...(subtitulo ? [{ text: subtitulo, color: MUTED, margin: [0, 2, 0, 6] } as Content] : []),
        ...(p.acercaDe ? [{ text: lista(p.acercaDe), italics: true, fontSize: 10 } as Content] : []),
      ] },
    ], columnGap: 12, margin: [0, 0, 0, 10] },
    { table: { widths: ['*', '*'], body: [
      [caja('Objetivos', p.objetivos, '#e8f1fb'), caja('Necesidades', p.necesidades, '#eef0fb')],
      [caja('Motivaciones', p.motivaciones, '#e6f4ec'), caja('Frustraciones', p.frustraciones, '#fbe4e1')],
      [caja('Comportamientos', p.comportamientos, '#f4f5f7'), caja('Contexto de uso', p.contextoDeUso, '#f4f5f7')],
    ] }, layout: { hLineWidth: () => 3, vLineWidth: () => 3, hLineColor: () => '#ffffff', vLineColor: () => '#ffffff' }, margin: [0, 0, 0, 12] },
  ];
}

interface FasePdf { nombre: string; emocion: Emocion; actividades?: unknown; touchpoints?: unknown; pensamientos?: unknown; dificultades?: unknown; ganancias?: unknown; oportunidades?: unknown }
interface JourneyPdf { perfilUsuario: { nombre: string; rol?: string }; objetivo?: unknown; eventoInicio?: unknown; fases: FasePdf[] }

/** SVG de la curva de emociones, con los mismos puntos y trazo que la página. */
export function svgCurva(emociones: Emocion[]): string {
  const ancho = CURVA_ANCHO_FASE * emociones.length;
  const puntos = puntosCurva(emociones);
  const circulos = puntos.map((pt, i) => `<circle cx="${pt.x}" cy="${pt.y}" r="7" fill="${COLOR_EMOCION[emociones[i]]}"/>`).join('');
  const guias = [20, 56, 92].map(y => `<line x1="0" y1="${y}" x2="${ancho}" y2="${y}" stroke="#d7dde7" stroke-width="1" stroke-dasharray="4 4"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${CURVA_ALTO}" viewBox="0 0 ${ancho} ${CURVA_ALTO}">${guias}<path d="${trazoCurva(puntos)}" fill="none" stroke="${TEAL}" stroke-width="3"/>${circulos}</svg>`;
}

const CARRILES: { campo: keyof FasePdf; etiqueta: string; fondo: string }[] = [
  { campo: 'actividades', etiqueta: 'Actividades', fondo: '#f4f5f7' },
  { campo: 'touchpoints', etiqueta: 'Puntos de contacto', fondo: '#e8f1fb' },
  { campo: 'pensamientos', etiqueta: 'Pensamientos', fondo: '#eef0fb' },
  { campo: 'dificultades', etiqueta: 'Dificultades / puntos de dolor', fondo: '#fbe4e1' },
  { campo: 'ganancias', etiqueta: 'Ganancias / aspectos positivos', fondo: '#e6f4ec' },
  { campo: 'oportunidades', etiqueta: 'Oportunidades de mejora', fondo: '#fbf2dc' },
];

/** Ancho útil de A4 horizontal con márgenes de 54 pt; se dejan 2 pt de holgura para que nada se corte. */
const ANCHO_UTIL = 842 - 54 * 2 - 2;
const PADDING = 5;
/** Con más fases, las columnas quedan demasiado angostas para leer: el tablero continúa en otro bloque. */
export const MAX_FASES_POR_TABLERO = 4;
const Y_EMOCION: Record<Emocion, number> = { Positiva: 14, Neutral: 40, Negativa: 66 };

/** Curva alineada con las columnas del tablero: un punto en el centro de cada fase. */
export function svgCurvaColumnas(emociones: Emocion[], ancho: number): string {
  const alto = 80;
  const col = ancho / emociones.length;
  const pts = emociones.map((e, i) => ({ x: col * (i + 0.5), y: Y_EMOCION[e] }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], m = (b.x - a.x) / 2;
    d += ` C ${a.x + m} ${a.y}, ${b.x - m} ${b.y}, ${b.x} ${b.y}`;
  }
  const guias = Object.values(Y_EMOCION).map(y => `<line x1="0" y1="${y}" x2="${ancho}" y2="${y}" stroke="#d7dde7" stroke-width="1" stroke-dasharray="4 4"/>`).join('');
  const puntos = pts.map((pt, i) => `<circle cx="${pt.x}" cy="${pt.y}" r="7" fill="${COLOR_EMOCION[emociones[i]]}" stroke="#ffffff" stroke-width="2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${guias}<path d="${d}" fill="none" stroke="${TEAL}" stroke-width="3"/>${puntos}</svg>`;
}

function tablero(fases: FasePdf[], desde: number): Content {
  const n = fases.length;
  const etiqueta = 96;
  // Ancho total = etiqueta + fases + padding de cada columna + bordes: debe caber en ANCHO_UTIL.
  const anchoFase = Math.floor((ANCHO_UTIL - etiqueta - (n + 1) * PADDING * 2 - (n + 2)) / n);
  const anchoCurva = n * anchoFase + (n - 1) * (PADDING * 2 + 1);
  const rotulo = (texto: string, fondo: string, color = INK): TableCell => ({ text: texto, bold: true, fontSize: 8.5, color, fillColor: fondo });
  const fila = (titulo: TableCell, celdas: TableCell[]): TableCell[] => [titulo, ...celdas];
  return {
    table: {
      // Filas enteras salvo que alguna celda sea tan larga que la fila no quepa en una hoja
      // (pdfmake la cortaría): entonces la fila puede seguir en la hoja siguiente.
      headerRows: 1, dontBreakRows: fases.every(f => CARRILES.every(({ campo }) => lista(f[campo]).length < 600)), widths: [etiqueta, ...fases.map(() => anchoFase)], body: [
        fila(rotulo('Fase', INK, '#ffffff'), fases.map((f, i) => ({ text: `${desde + i + 1}. ${f.nombre}`, bold: true, fontSize: 10, color: '#ffffff', fillColor: INK }))),
        [{ stack: [{ text: 'Emoción', bold: true, fontSize: 8.5 }, { text: 'Arriba: positiva\nAbajo: negativa', fontSize: 7, color: MUTED, margin: [0, 2, 0, 0] }], fillColor: '#ffffff' },
          { colSpan: n, svg: svgCurvaColumnas(fases.map(f => f.emocion), anchoCurva), width: anchoCurva } as TableCell, ...Array.from({ length: n - 1 }, () => ({}) as TableCell)],
        fila(rotulo('', '#ffffff'), fases.map(f => ({ text: f.emocion, fontSize: 9.5, bold: true, alignment: 'center', color: COLOR_EMOCION[f.emocion], fillColor: FONDO_EMOCION[f.emocion] }))),
        ...CARRILES.map(({ campo, etiqueta: titulo, fondo }) => fila(rotulo(titulo, fondo), fases.map(f => ({ text: lista(f[campo]), fontSize: 9, lineHeight: 1.15, fillColor: fondo })))),
      ],
    },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#ffffff', vLineColor: () => '#ffffff', paddingLeft: () => PADDING, paddingRight: () => PADDING, paddingTop: () => 4, paddingBottom: () => 4 },
    margin: [0, 0, 0, 12],
  };
}

export function journeyVisual(j: JourneyPdf): Content[] {
  const n = j.fases.length;
  if (!n) return [{ text: 'Este recorrido no tiene fases.', color: MUTED }];
  const meta = [
    j.eventoInicio ? caja('Evento de inicio', j.eventoInicio, '#e8f1fb') : null,
    j.objetivo ? caja('Objetivo del recorrido', j.objetivo, '#e6f4ec') : null,
  ].filter((c): c is TableCell => !!c);
  const tramos: FasePdf[][] = [];
  for (let k = 0; k < n; k += MAX_FASES_POR_TABLERO) tramos.push(j.fases.slice(k, k + MAX_FASES_POR_TABLERO));
  return [
    { text: [{ text: j.perfilUsuario.nombre, bold: true, fontSize: 14, color: INK }, ...(j.perfilUsuario.rol ? [{ text: `  ${j.perfilUsuario.rol}`, color: MUTED }] : [])], margin: [0, 0, 0, 8] },
    ...(meta.length ? [{ table: { widths: meta.map(() => '*'), body: [meta] }, layout: 'noBorders', margin: [0, 0, 0, 8] } as Content] : []),
    ...tramos.flatMap((tramo, t): Content[] => [
      ...(tramos.length > 1 ? [{ text: `Fases ${t * MAX_FASES_POR_TABLERO + 1} a ${t * MAX_FASES_POR_TABLERO + tramo.length} de ${n}`, style: 'eyebrow', margin: [0, 0, 0, 4], ...(t ? { pageBreak: 'before' as const } : {}) } as Content] : []),
      tablero(tramo, t * MAX_FASES_POR_TABLERO),
    ]),
  ];
}
