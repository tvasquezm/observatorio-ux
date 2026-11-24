import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { resumirEvaluacion, type FaseHeuristica } from '@observatorio-ux/shared-types';
import type { ProjectReport, ReportMethod } from '../../features/reports/report-data';
import { INK, MUTED, TEAL, paragraph, table, textValue, title } from './pdf-base';
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES, keepHeadingsWithContent } from './pdf-base';
import { cuerpoVista } from '../../features/card-sorting/card-sorting-pdf-content';
import { journeyVisual, personaVisual } from './pdf-visual';
import { cargarEvidencia } from '../../features/heuristica-flujo/evidencia.api';

/** Imágenes ya convertidas a PNG para incrustar (fotos de personas y capturas de la heurística). */
export type ReportConImagenes = ProjectReport & { imagenes?: Record<string, string>; piesCapturas?: Record<string, string> };
const claveCaptura = (evaluacionId: string, evidenciaId: string) => `captura-${evaluacionId}-${evidenciaId}`;
import { tablaDeVista, tablaSinConsenso } from '../../features/card-sorting/card-sorting-export';

export { INK, MUTED, TEAL, paragraph, table, title };
export { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES, keepHeadingsWithContent };

export type ReportBrand = { logo: string; logoWhite: string };

const fases: Record<FaseHeuristica, string> = { BORRADOR: 'Borrador', EN_EVALUACION: 'En evaluación', PENDIENTE_CONSENSO: 'Pendiente de consenso', CONSOLIDADA: 'Consolidada', FINALIZADA: 'Finalizada' };
const severityLabels = ['Sin problema', 'Cosmético', 'Menor', 'Mayor', 'Crítico'];
const severityColors = ['#526a73', '#526a73', '#85601b', '#a44626', '#922f3d'];
export const date = (value: string | Date): string => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value));
const empty = (): Content => ({ text: 'Sin registros guardados para esta técnica dentro de tu acceso actual.', color: MUTED, italics: true, margin: [0, 16, 0, 12] });

function details(rows: Array<[string, unknown]>): Content {
  return {
    table: { widths: [118, '*'], body: rows.map(([label, value]) => [
      { text: label, bold: true, color: MUTED, fontSize: 9 },
      { text: textValue(value), fontSize: 9.5, lineHeight: 1.15 },
    ]) },
    layout: {
      hLineWidth: (index) => index === 0 ? 0 : 0.5,
      hLineColor: () => '#d7dde7', vLineWidth: () => 0,
      paddingLeft: () => 0, paddingRight: () => 14,
      paddingTop: () => 3, paddingBottom: () => 3,
    }, margin: [0, 0, 0, 12],
  };
}

/** Apartado del informe -> vista de resultados de card sorting (las mismas del PDF del estudio). */
const VISTAS_CARD_SORTING: Array<[string, Parameters<typeof tablaDeVista>[0]]> = [
  ['tarjetas', 'cards'], ['categorias', 'categories'], ['matriz', 'results'], ['populares', 'popular'],
  ['similitud', 'similarity'], ['dendrograma', 'dendrogram'], ['participantes', 'participants'],
];

/**
 * Vistas de resultados elegidas, con sus gráficos. Todo el informe va apaisado, así que
 * las matrices anchas caben sin cambiar de orientación; los gráficos (mapa de calor y
 * dendrograma) abren hoja propia para verse completos.
 */
function detalleCardSorting(analytics: Parameters<typeof tablaDeVista>[1], incluye: (parte: string) => boolean): Content[] {
  return VISTAS_CARD_SORTING.filter(([parte]) => incluye(parte)).flatMap(([, vista], index) => {
    const tabla = tablaDeVista(vista, analytics);
    const sinConsenso = vista === 'cards' ? tablaSinConsenso(analytics) : null;
    const hojaPropia = index > 0 && !!tabla.grafico;
    return [
      { stack: [title(tabla.titulo)], ...(hojaPropia ? { pageBreak: 'before' as const } : {}) },
      paragraph(tabla.descripcion),
      ...cuerpoVista(tabla, true),
      ...(sinConsenso ? [title(sinConsenso.titulo), paragraph(sinConsenso.descripcion), ...cuerpoVista(sinConsenso, true)] : []),
    ];
  });
}

/** Ancho útil de la hoja apaisada (A4 horizontal menos márgenes laterales). */
const ANCHO_UTIL = 842 - 108;
/** Alto útil de la hoja apaisada (A4 horizontal menos márgenes superior e inferior). */
const ALTO_UTIL = 595 - 72 - 54;
/**
 * Alto estimado (pt) de un texto: en la tabla de detalle el valor tiene ~600 pt de ancho a
 * 9,5 pt (≈ 110 caracteres por línea de 13 pt); en párrafo, ~734 pt a 11 pt (≈ 120 por línea de 15 pt).
 */
const altoTexto = (valor: unknown, porLinea = 110, linea = 13) => textValue(valor).split('\n').reduce((total, l) => total + Math.max(1, Math.ceil(l.length / porLinea)) * linea, 0);

function sections(report: ReportConImagenes): Record<ReportMethod, Content[]> {
  /** Captura con su pie: quién la subió y anotó, y cuándo. */
  const capturaConPie = (evaluacionId: string, id: string, alto = 340): Content => {
    const pie = report.piesCapturas?.[claveCaptura(evaluacionId, id)];
    return { stack: [{ image: claveCaptura(evaluacionId, id), fit: [ANCHO_UTIL, alto], alignment: 'center', margin: [0, 4, 0, pie ? 2 : 8] }, ...(pie ? [{ text: pie, fontSize: 8, color: MUTED, margin: [0, 0, 0, 8] } as Content] : [])], unbreakable: true };
  };
  const capturaOAviso = (evaluacionId: string, id: string, alto?: number): Content => report.imagenes?.[claveCaptura(evaluacionId, id)]
    ? capturaConPie(evaluacionId, id, alto)
    : { text: 'Captura disponible en la aplicación (no se pudo incluir en este PDF).', italics: true, color: MUTED, margin: [0, 2, 0, 6] };
  /**
   * Texto con su primera captura en un mismo bloque que no se parte (la captura se achica
   * para caber con el texto en la hoja); las demás capturas siguen, cada una entera.
   * Con texto muy largo el bloque sí puede partirse y la captura va aparte.
   */
  const conCapturas = (evaluacionId: string, texto: Content[], ids: string[], altoTextoBloque: number, hojaNueva: boolean): Content[] => {
    const alto = Math.min(340, Math.floor(ALTO_UTIL - altoTextoBloque - 40));
    const juntas = alto >= 150;
    const [primera, ...resto] = juntas ? ids : [];
    return [
      { stack: [...texto, ...(primera ? [capturaOAviso(evaluacionId, primera, alto)] : [])], unbreakable: altoTextoBloque < ALTO_UTIL - 20, ...(hojaNueva ? { pageBreak: 'before' as const } : {}) },
      ...(juntas ? resto : ids).map(id => capturaOAviso(evaluacionId, id)),
    ];
  };
  const incluye = (metodo: ReportMethod, parte: string) => report.partes?.[metodo]?.includes(parte) ?? true;
  const incluyeCards = (parte: string) => incluye('cards', parte);
  return {
    // Cada persona, recorrido y estudio abre hoja propia (salvo el primero, que sigue a la portada de sección).
    personas: report.personas?.flatMap(({ contenido: person, version }, i) => [
      { stack: [title(`${i + 1}. ${person.nombreCompleto}`)], ...(i > 0 ? { pageBreak: 'before' as const } : {}) },
      { text: `PERSONA · VERSIÓN ${version}`, style: 'eyebrow', margin: [0, 0, 0, 8] },
      // F40: la tarjeta tal como se ve en la página; el desglose sigue debajo.
      ...(incluye('personas', 'visual') ? personaVisual(person) : []),
      // Sin la tarjeta, la foto va igual junto al perfil.
      ...(!incluye('personas', 'visual') && incluye('personas', 'perfil') && person.fotografiaUrl && /^data:image\/(png|jpeg);base64,/.test(person.fotografiaUrl) ? [{ image: person.fotografiaUrl, fit: [110, 110], margin: [0, 0, 0, 8] } as Content] : []),
      details([
        ...(incluye('personas', 'perfil') ? [
          ['Edad', person.edad], ['Ocupación', person.ocupacion], ['Acerca de', person.acercaDe],
          ['Familia', person.familia], ['Hobbies', person.hobbies], ['Habilidades', person.habilidades],
        ] as Array<[string, unknown]> : []),
        ...(incluye('personas', 'necesidades') ? [
          ['Objetivos', person.objetivos], ['Necesidades', person.necesidades], ['Motivaciones', person.motivaciones],
          ['Frustraciones', person.frustraciones], ['Comportamientos', person.comportamientos],
          ['Contexto de uso', person.contextoDeUso], ['Expectativas', person.expectativas],
          ['Rol en el servicio', person.rolEnServicio], ['Relación con el servicio', person.relacionConServicio],
          ['Características distintivas', person.caracteristicasDistintivas],
        ] as Array<[string, unknown]> : []),
        ...(incluye('personas', 'validacion') ? [
          ['Evidencia', person.evidencia],
          ['Estado de validación', person.estadoValidacion === 'VALIDADA' ? 'Validada' : 'Pendiente'],
          ['Observaciones de validación', person.observacionesValidacion],
        ] as Array<[string, unknown]> : []),
      ]),
    ]) ?? [],
    journey: report.journeys?.flatMap(({ contenido: journey, version }, i) => [
      { stack: [title(`${i + 1}. Recorrido de ${journey.perfilUsuario.nombre}`)], ...(i > 0 ? { pageBreak: 'before' as const } : {}) },
      paragraph(`${journey.perfilUsuario.rol} · Versión ${version} · ${journey.fases.length} fases`),
      // F40: el tablero con la curva de emociones, como en la página; el desglose sigue debajo.
      ...(incluye('journey', 'visual') ? journeyVisual(journey) : []),
      ...(incluye('journey', 'resumen') ? [details([
        ['Objetivo del recorrido', journey.objetivo], ['Evento de inicio', journey.eventoInicio],
        ['Evidencia', journey.evidencia],
      ])] : []),
      ...(incluye('journey', 'fases') ? [table(['Fase', 'Puntos de contacto', 'Pensamientos', 'Emoción', 'Oportunidades'], journey.fases.map((phase, index) => [
        `${index + 1}. ${phase.nombre}`, phase.touchpoints, phase.pensamientos, phase.emocion, phase.oportunidades,
      ]), [80, '*', '*', 55, '*'], true)] : []),
      ...(incluye('journey', 'detalle') ? [
        title('Actividades, dificultades y aspectos positivos'),
        table(['Fase', 'Actividades', 'Dificultades / puntos de dolor', 'Ganancias / aspectos positivos'], journey.fases.map((phase, index) => [
          `${index + 1}. ${phase.nombre}`, phase.actividades, phase.dificultades, phase.ganancias,
        ]), [80, '*', '*', '*'], true),
      ] : []),
    ]) ?? [],
    momentos: report.moments?.flatMap(({ contenido: moment, version }, i) => [
      { stack: [title(`${i + 1}. Incidentes de ${moment.perfilUsuario.nombre}`)], ...(i > 0 ? { pageBreak: 'before' as const } : {}) },
      paragraph(`${moment.perfilUsuario.rol} · Versión ${version} · ${moment.incidentes.length} incidentes`),
      ...(incluye('momentos', 'tabla') ? [table(['Incidente', 'Tipo', 'Impacto', 'Frecuencia'], moment.incidentes.map((incident) => [incident.nombre, incident.tipo, incident.impacto, incident.frecuencia]), ['*', 65, 60, 68])] : []),
      // Cada incidente va entero: título y detalle no quedan en hojas distintas.
      ...(incluye('momentos', 'detalle') ? moment.incidentes.map((incident, index): Content => ({ stack: [
        title(`${index + 1}. ${incident.nombre}`),
        details([['Descripción', incident.descripcion], ['Causa', incident.causa], ['Acciones sugeridas', incident.accionesSugeridas]]),
      ], unbreakable: JSON.stringify(incident).length < 2400 })) : []),
    ]) ?? [],
    cards: report.cards?.flatMap(({ study, analytics }, i) => [
      // Si el estudio anterior terminó en una matriz apaisada, este vuelve a página vertical.
      { stack: [title(`${i + 1}. ${study.nombre}`)], ...(i > 0 ? { pageBreak: 'before' as const } : {}) },
      paragraph(`Modalidad: ${study.tipoCardSorting ?? 'Sin modalidad'} · Estudio ${study.cerrado ? 'cerrado' : 'abierto'} · Creado el ${date(study.createdAt)}`),
      ...(incluye('cards', 'resumen') ? [
        table(['Respuestas completas', 'Tarjetas', 'Acuerdo global'], [[analytics.participantesCount, analytics.cardsCount, analytics.participantesCount ? `${analytics.acuerdoGlobal}%` : 'Sin respuestas']]),
        paragraph('Los resultados agregados consideran únicamente sesiones completadas. El acuerdo global representa similitud entre pares de tarjetas, no una puntuación de usabilidad.'),
        details([['Tarjetas definidas', study.cardsDefinidas.map((card) => card.etiqueta)], ['Categorías predefinidas', study.categoriasDefinidas.map((category) => category.nombre)]]),
      ] : []),
      ...(VISTAS_CARD_SORTING.some(([parte]) => incluyeCards(parte)) || incluyeCards('agrupaciones') ? (analytics.participantesCount ? [
        ...detalleCardSorting(analytics, incluyeCards),
        ...(incluyeCards('agrupaciones') && analytics.clusters.length ? [
          title('Agrupaciones sugeridas'),
          table(['Grupo', 'Tarjetas', 'Acuerdo'], analytics.clusters.map((cluster) => [cluster.nombre, cluster.tarjetas, `${cluster.acuerdo}%`]), [100, '*', 60]),
        ] : []),
      ] : [paragraph('Aún no hay respuestas completadas para calcular resultados.')]) : []),
    ]) ?? [],
    heuristica: report.heuristics?.flatMap((evaluacion, i): Content[] => {
      const { configuracion: config, informe } = evaluacion;
      // Cada evaluación abre hoja propia (salvo la primera, que sigue a la portada de sección).
      const cabecera: Content[] = [
        { stack: [title(`${i + 1}. ${config.nombre || config.producto.nombre}`)], ...(i > 0 ? { pageBreak: 'before' as const } : {}) },
        paragraph(`${config.producto.nombre} · ${config.metodologia.nombre} · Versión ${evaluacion.version} · ${fases[evaluacion.fase]}`),
      ];
      if (!informe) return [...cabecera, paragraph('Esta evaluación todavía no está consolidada: aún no hay hallazgos aceptados.')];
      const resumen = resumirEvaluacion(informe.configuracion, informe.consenso);
      const nombreCriterio = (id: string) => informe.configuracion.metodologia.criterios.find((criterio) => criterio.id === id)?.nombre ?? id;
      const problemas = informe.consenso.hallazgos.filter((h) => h.decision === 'ACEPTADO').sort((a, b) => b.severidad - a.severidad);
      return [
        ...cabecera,
        ...(incluye('heuristica', 'severidad') ? [paragraph(`${problemas.length} hallazgos aceptados · ${informe.finalizadoEn ? `Finalizada el ${date(informe.finalizadoEn)}` : 'Informe preliminar, pendiente de cierre'}`)] : []),
        ...(problemas.length ? [
          ...(incluye('heuristica', 'severidad') ? [table(['Severidad', 'Problemas'], severityLabels.map((label, level) => [`${level} · ${label}`, resumen.porSeveridad[level] ?? 0]), ['*', 90])] : []),
          // Un problema por hoja: su texto y su primera captura juntos; las demás capturas
          // (con su pie) siguen enteras, en la misma hoja si caben o en la siguiente.
          ...(incluye('heuristica', 'problemas') ? problemas.flatMap((problema, index): Content[] => conCapturas(evaluacion.id, [
            title(`Problema ${index + 1} · ${problema.titulo}`),
            { text: `SEVERIDAD ${problema.severidad} · ${severityLabels[problema.severidad] ?? 'Sin clasificar'} · PRIORIDAD ${problema.prioridad}`, bold: true, color: severityColors[problema.severidad] ?? INK, margin: [0, 0, 0, 8] },
            details([['Pantalla o tarea', problema.pantalla], ['Criterios', problema.criterioIds.map(nombreCriterio)], ['Problema', problema.descripcion], ['Recomendación', problema.recomendacion]]),
          ], problema.evidenciaIds, 80 + [problema.pantalla, problema.criterioIds.map(nombreCriterio), problema.descripcion, problema.recomendacion].reduce((t: number, v) => t + 6 + altoTexto(v), 0), index > 0 || incluye('heuristica', 'severidad'))) : []),
        ] : [paragraph('La revisión acordada no identificó problemas de usabilidad.')]),
        // Lo que funciona bien: también es evidencia del informe, con sus capturas.
        // En hoja nueva; cada aspecto con capturas va junto a la primera de ellas.
        ...(incluye('heuristica', 'positivos') && informe.consenso.positivos?.length ? [
          { stack: [title('Lo que funciona bien')], pageBreak: 'before' } as Content,
          ...informe.consenso.positivos.flatMap((positivo): Content[] => conCapturas(evaluacion.id, [
            { text: positivo.titulo, bold: true, margin: [0, 2, 0, 3] },
            ...(positivo.descripcion ? [paragraph(positivo.descripcion)] : []),
          ], positivo.evidenciaIds ?? [], 24 + altoTexto(positivo.descripcion ?? '', 120, 15), false)),
        ] : []),
      ];
    }) ?? [],
  };
}

export function brandChrome(brand: ReportBrand | undefined, scope: string, generatedAt: Date): Pick<TDocumentDefinitions, 'background' | 'header' | 'footer'> {
  return {
    header: () => ({
      columns: [
        brand ? { image: 'brandLogo', width: 125 } : { text: 'UXLab Observatorio', color: INK, bold: true, fontSize: 10 },
        { text: scope, alignment: 'right', fontSize: 8, color: MUTED, margin: [0, 10, 0, 0] },
      ], margin: [54, 25, 54, 0],
    }),
    footer: (page, total, size) => ({
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: size.width - 108, y2: 0, lineWidth: 0.4, lineColor: '#b4bbc5' }], margin: [0, 0, 0, 10] },
        { columns: [
          { text: `Evidencia de investigación · ${date(generatedAt)}`, fontSize: 8, color: MUTED },
          { text: `${page} / ${total}`, alignment: 'right', fontSize: 8, color: MUTED },
        ] },
      ], margin: [54, 12, 54, 0],
    }),
  };
}

export function buildReportDefinition(report: ReportConImagenes, brand?: ReportBrand): TDocumentDefinitions {
  const blocks = sections(report);
  const counts: Record<ReportMethod, number> = {
    personas: report.personas?.length ?? 0, journey: report.journeys?.length ?? 0,
    momentos: report.moments?.length ?? 0, cards: report.cards?.length ?? 0, heuristica: report.heuristics?.length ?? 0,
  };
  const scope = report.methods.length === 5 ? 'INFORME COMPLETO' : 'INFORME POR TÉCNICAS';
  return {
    info: { title: `Informe UX · ${report.project.nombre}`, subject: report.methods.map(({ label }) => label).join(', '), creator: 'UXLab Observatorio' },
    // Todas las hojas iguales: A4 apaisado, el formato que necesitan journey maps y matrices.
    pageSize: 'A4', pageOrientation: 'landscape', pageMargins: PDF_PAGE_MARGINS,
    defaultStyle: PDF_DEFAULT_STYLE,
    images: { ...(brand ? { brandLogo: brand.logo, brandLogoWhite: brand.logoWhite } : {}), ...(report.imagenes ?? {}) },
    ...brandChrome(brand, scope, report.generatedAt),
    content: [
      { text: 'INFORME DE INVESTIGACIÓN UX', style: 'eyebrow', alignment: 'center', margin: [0, 36, 0, 18] },
      { text: report.project.nombre, style: 'coverTitle' },
      paragraph(report.project.descripcion || 'Informe de técnicas y evidencia registrada en el proyecto.'),
      { columns: [
        { stack: [{ text: 'FECHA DE EXPORTACIÓN', style: 'eyebrow' }, { text: date(report.generatedAt), margin: [0, 5, 0, 0] }] },
        { stack: [{ text: scope, style: 'eyebrow' }, { text: `${report.methods.length} de 5 técnicas`, margin: [0, 5, 0, 0] }] },
      ], margin: [0, 12, 0, 12] },
      title('Contenido y cobertura'),
      table(['Sección', 'Técnica', 'Registros'], report.methods.map(({ id, label }, i) => [`0${i + 1}`, label, counts[id]]), [48, '*', 65]),
      { text: 'ALCANCE DEL INFORME', style: 'eyebrow', margin: [0, 16, 0, 8] },
      paragraph('Se incluyen las versiones vigentes guardadas y las sesiones accesibles para la cuenta que exporta. Los registros cuentan fichas, mapas, matrices, estudios o sesiones según la técnica; no representan participantes únicos.'),
      paragraph('La cobertura corresponde a los datos accesibles para la cuenta que exporta. Una técnica sin registros no implica que haya sido evaluada ni que esté libre de problemas.'),
      ...report.methods.flatMap(({ id, label, detail }, index): Content[] => [
        { stack: [
          { text: `SECCIÓN 0${index + 1}`, style: 'eyebrow', margin: [0, 10, 0, 12] },
          { text: label, style: 'sectionTitle' },
          { text: detail, color: MUTED, margin: [0, 0, 0, 18] },
          { canvas: [
            { type: 'line', x1: 0, y1: 0, x2: ANCHO_UTIL - 1, y2: 0, lineWidth: .5, lineColor: '#b4bbc5' },
          ], margin: [0, 0, 0, 12] },
          ...(blocks[id].length ? [] : [empty()]),
        // Cada sección empieza en hoja nueva: se lee completa y no queda pegada a la anterior.
        ], unbreakable: true, pageBreak: 'before' },
        ...blocks[id],
      ]),
    ],
    styles: PDF_STYLES,
    pageBreakBefore: keepHeadingsWithContent,
  };
}

export async function loadBrandImage(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error('No pudimos cargar la identidad del informe. Inténtalo nuevamente.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No pudimos preparar el logo del informe. Inténtalo nuevamente.'));
    reader.readAsDataURL(blob);
  });
}

let cargaPdf: ReturnType<typeof cargarPdfMakeSinCache> | null = null;

// Una sola carga por sesión; si falla se puede reintentar.
export function cargarPdfMake() {
  if (!cargaPdf) {
    cargaPdf = cargarPdfMakeSinCache().catch((error) => {
      cargaPdf = null;
      throw error;
    });
  }
  return cargaPdf;
}

// Se llama al pasar el mouse o enfocar un botón de exportar, para que el clic ya encuentre todo cargado.
export function precargarPdf(): void {
  cargarPdfMake().catch(() => {});
}

async function cargarPdfMakeSinCache() {
  const fontFiles = ['lmroman10-regular.otf', 'lmroman10-bold.otf', 'lmroman10-italic.otf', 'lmroman10-bolditalic.otf'];
  const [pdfMakeModule, logo, logoWhite, ...fonts] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    loadBrandImage('/brand/uxlab-observatorio.png'), loadBrandImage('/brand/uxlab-observatorio-white.png'),
    ...fontFiles.map((file) => loadBrandImage(`/fonts/${file}`)),
  ]);
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
  pdfMake.addVirtualFileSystem(Object.fromEntries(fontFiles.map((file, index) => [file, fonts[index].split(',')[1]])));
  pdfMake.addFonts({ LatinModern: { normal: fontFiles[0], bold: fontFiles[1], italics: fontFiles[2], bolditalics: fontFiles[3] } });
  return { pdfMake, brand: { logo, logoWhite } as ReportBrand };
}

/** Convierte cualquier imagen (WebP, URL o data URL) a PNG para pdfmake; null si el navegador no puede leerla. */
export async function imagenAPng(src: string): Promise<string | null> {
  if (/^data:image\/(png|jpeg);base64,/.test(src)) return src;
  try {
    const blob = await (await fetch(src)).blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const factor = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * factor)); canvas.height = Math.max(1, Math.round(bitmap.height * factor));
      const ctx = canvas.getContext('2d'); if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally { bitmap.close(); }
  } catch { return null; }
}

/** Prepara las imágenes del informe: fotos de personas y capturas (con anotaciones) de los problemas aceptados. */
export async function prepararImagenesReporte(report: ProjectReport): Promise<ReportConImagenes> {
  const imagenes: Record<string, string> = {};
  const piesCapturas: Record<string, string> = {};
  const personas = report.personas ? await Promise.all(report.personas.map(async p => {
    const foto = p.contenido.fotografiaUrl ? await imagenAPng(p.contenido.fotografiaUrl) : null;
    return { ...p, contenido: { ...p.contenido, fotografiaUrl: foto ?? undefined } };
  })) : undefined;
  const incluyeProblemas = report.partes?.heuristica?.includes('problemas') ?? true;
  const incluyePositivos = report.partes?.heuristica?.includes('positivos') ?? true;
  if (report.heuristics && (incluyeProblemas || incluyePositivos)) {
    const { rasterizarEvidencia } = await import('../../features/heuristica-flujo/informe-pdf');
    const { autoriaCaptura, notasCaptura } = await import('../../features/heuristica-flujo/flujo-utils');
    for (const e of report.heuristics) {
      const ids = [
        ...(incluyeProblemas ? e.informe?.consenso.hallazgos.filter(x => x.decision === 'ACEPTADO').flatMap(h => h.evidenciaIds) ?? [] : []),
        ...(incluyePositivos ? e.informe?.consenso.positivos?.flatMap(p => p.evidenciaIds ?? []) ?? [] : []),
      ];
      for (const id of new Set(ids)) {
        try { const { meta, blob } = await cargarEvidencia(e.proyectoId, e.id, id); imagenes[claveCaptura(e.id, id)] = await rasterizarEvidencia(blob, meta.anotaciones); piesCapturas[claveCaptura(e.id, id)] = [autoriaCaptura(meta), notasCaptura(meta.anotaciones)].filter(Boolean).join('\n'); } catch { /* queda el aviso en el PDF */ }
      }
    }
  }
  return { ...report, personas, imagenes, piesCapturas };
}

export async function exportarReportePdf(reporte: ProjectReport): Promise<void> {
  const report = await prepararImagenesReporte(reporte);
  const { pdfMake, brand } = await cargarPdfMake();
  const slug = report.project.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'proyecto';
  const scope = report.methods.length === 5 ? 'completo' : report.methods.map(({ id }) => id).join('-');
  await pdfMake.createPdf(buildReportDefinition(report, brand)).download(`observatorio-ux-${slug}-${scope}-${report.generatedAt.toISOString().slice(0, 10)}.pdf`);
}
