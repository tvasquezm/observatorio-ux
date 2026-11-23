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

export function journeyVisual(j: JourneyPdf): Content[] {
  const n = j.fases.length;
  if (!n) return [{ text: 'Este recorrido no tiene fases.', color: MUTED }];
  // Ancho útil de una página A4 horizontal con los márgenes del informe: ~730 pt.
  const etiqueta = 92;
  const anchoFase = Math.max(60, Math.floor((730 - etiqueta) / n));
  const meta = [
    j.eventoInicio ? caja('Evento de inicio', j.eventoInicio, '#e8f1fb') : null,
    j.objetivo ? caja('Objetivo del recorrido', j.objetivo, '#e6f4ec') : null,
  ].filter((c): c is TableCell => !!c);
  const fila = (titulo: string, celdas: TableCell[], fondo: string): TableCell[] => [{ text: titulo, bold: true, fontSize: 7.5, fillColor: fondo }, ...celdas];
  return [
    { text: [{ text: j.perfilUsuario.nombre, bold: true, fontSize: 14, color: INK }, ...(j.perfilUsuario.rol ? [{ text: `  ${j.perfilUsuario.rol}`, color: MUTED }] : [])], margin: [0, 0, 0, 8] },
    ...(meta.length ? [{ table: { widths: meta.map(() => '*'), body: [meta] }, layout: 'noBorders', margin: [0, 0, 0, 8] } as Content] : []),
    { table: { headerRows: 1, widths: [etiqueta, ...j.fases.map(() => anchoFase)], body: [
      fila('Fase', j.fases.map((f, i) => ({ text: `${i + 1}. ${f.nombre}`, bold: true, fontSize: 8, color: '#ffffff', fillColor: INK })), INK).map((c, i) => i === 0 ? { ...(c as object), color: '#ffffff' } as TableCell : c),
      [{ text: 'Emoción', bold: true, fontSize: 7.5, fillColor: '#ffffff' }, { colSpan: n, svg: svgCurva(j.fases.map(f => f.emocion)), width: anchoFase * n - 8 } as TableCell, ...Array.from({ length: n - 1 }, () => ({}) as TableCell)],
      fila('', j.fases.map(f => ({ text: f.emocion, fontSize: 7.5, bold: true, alignment: 'center', color: COLOR_EMOCION[f.emocion], fillColor: FONDO_EMOCION[f.emocion] })), '#ffffff'),
      ...CARRILES.map(({ campo, etiqueta: titulo, fondo }) => fila(titulo, j.fases.map(f => ({ text: lista(f[campo]), fontSize: 7.5, fillColor: fondo })), fondo)),
    ] }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#ffffff', vLineColor: () => '#ffffff', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 12] },
  ];
}
