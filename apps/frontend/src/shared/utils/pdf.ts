import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { resumirEvaluacion, type FaseHeuristica } from '@observatorio-ux/shared-types';
import type { ProjectReport, ReportMethod } from '../../features/reports/report-data';
import { INK, MUTED, TEAL, paragraph, table, textValue, title } from './pdf-base';
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES, keepHeadingsWithContent } from './pdf-base';
import { cuerpoVista } from '../../features/card-sorting/card-sorting-pdf-content';
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

// Mismas vistas que la pantalla de resultados: Tarjetas (con barras), sin consenso y Categorías.
function detalleCardSorting(analytics: Parameters<typeof tablaDeVista>[1]): Content[] {
  const sinConsenso = tablaSinConsenso(analytics);
  return [
    title('Tarjetas'),
    paragraph(tablaDeVista('cards', analytics).descripcion),
    ...cuerpoVista(tablaDeVista('cards', analytics)),
    ...(sinConsenso ? [title('Tarjetas sin consenso'), paragraph(sinConsenso.descripcion), ...cuerpoVista(sinConsenso)] : []),
    title('Categorías'),
    paragraph(tablaDeVista('categories', analytics).descripcion),
    ...cuerpoVista(tablaDeVista('categories', analytics)),
  ];
}

function sections(report: ProjectReport): Record<ReportMethod, Content[]> {
  return {
    personas: report.personas?.flatMap(({ contenido: person, version }, i) => [
      title(`${i + 1}. ${person.nombreCompleto}`),
      { text: `PERSONA · VERSIÓN ${version}`, style: 'eyebrow', margin: [0, 0, 0, 8] },
      details([
        ['Edad', person.edad], ['Ocupación', person.ocupacion], ['Acerca de', person.acercaDe],
        ['Familia', person.familia], ['Hobbies', person.hobbies], ['Habilidades', person.habilidades],
        ['Objetivos', person.objetivos], ['Necesidades', person.necesidades], ['Motivaciones', person.motivaciones],
        ['Frustraciones', person.frustraciones], ['Comportamientos', person.comportamientos],
        ['Contexto de uso', person.contextoDeUso], ['Expectativas', person.expectativas],
        ['Rol en el servicio', person.rolEnServicio], ['Relación con el servicio', person.relacionConServicio],
        ['Características distintivas', person.caracteristicasDistintivas], ['Evidencia', person.evidencia],
        ['Estado de validación', person.estadoValidacion === 'VALIDADA' ? 'Validada' : 'Pendiente'],
        ['Observaciones de validación', person.observacionesValidacion],
      ]),
    ]) ?? [],
    journey: report.journeys?.flatMap(({ contenido: journey, version }, i) => [
      title(`${i + 1}. Recorrido de ${journey.perfilUsuario.nombre}`),
      paragraph(`${journey.perfilUsuario.rol} · Versión ${version} · ${journey.fases.length} fases`),
      details([
        ['Objetivo del recorrido', journey.objetivo], ['Evento de inicio', journey.eventoInicio],
        ['Evidencia', journey.evidencia],
      ]),
      table(['Fase', 'Puntos de contacto', 'Pensamientos', 'Emoción', 'Oportunidades'], journey.fases.map((phase, index) => [
        `${index + 1}. ${phase.nombre}`, phase.touchpoints, phase.pensamientos, phase.emocion, phase.oportunidades,
      ]), [80, '*', '*', 55, '*'], true),
      title('Actividades, dificultades y aspectos positivos'),
      table(['Fase', 'Actividades', 'Dificultades / puntos de dolor', 'Ganancias / aspectos positivos'], journey.fases.map((phase, index) => [
        `${index + 1}. ${phase.nombre}`, phase.actividades, phase.dificultades, phase.ganancias,
      ]), [80, '*', '*', '*'], true),
    ]) ?? [],
    momentos: report.moments?.flatMap(({ contenido: moment, version }, i) => [
      title(`${i + 1}. Incidentes de ${moment.perfilUsuario.nombre}`),
      paragraph(`${moment.perfilUsuario.rol} · Versión ${version} · ${moment.incidentes.length} incidentes`),
      table(['Incidente', 'Tipo', 'Impacto', 'Frecuencia'], moment.incidentes.map((incident) => [incident.nombre, incident.tipo, incident.impacto, incident.frecuencia]), ['*', 65, 60, 68]),
      ...moment.incidentes.flatMap((incident, index) => [
        title(`${index + 1}. ${incident.nombre}`),
        details([['Descripción', incident.descripcion], ['Causa', incident.causa], ['Acciones sugeridas', incident.accionesSugeridas]]),
      ]),
    ]) ?? [],
    cards: report.cards?.flatMap(({ study, analytics }, i) => [
      title(`${i + 1}. ${study.nombre}`),
      paragraph(`Modalidad: ${study.tipoCardSorting ?? 'Sin modalidad'} · Estudio ${study.cerrado ? 'cerrado' : 'abierto'} · Creado el ${date(study.createdAt)}`),
      table(['Respuestas completas', 'Tarjetas', 'Acuerdo global'], [[analytics.participantesCount, analytics.cardsCount, analytics.participantesCount ? `${analytics.acuerdoGlobal}%` : 'Sin respuestas']]),
      paragraph('Los resultados agregados consideran únicamente sesiones completadas. El acuerdo global representa similitud entre pares de tarjetas, no una puntuación de usabilidad.'),
      details([['Tarjetas definidas', study.cardsDefinidas.map((card) => card.etiqueta)], ['Categorías predefinidas', study.categoriasDefinidas.map((category) => category.nombre)]]),
      ...(analytics.participantesCount ? [{
        stack: [
          ...detalleCardSorting(analytics),
          ...(analytics.clusters.length ? [title('Agrupaciones sugeridas'), table(['Grupo', 'Tarjetas', 'Acuerdo'], analytics.clusters.map((cluster) => [cluster.nombre, cluster.tarjetas, `${cluster.acuerdo}%`]), [100, '*', 60])] : []),
        ],
      } as Content] : [paragraph('Aún no hay respuestas completadas para calcular resultados.')]),
    ]) ?? [],
    heuristica: report.heuristics?.flatMap((evaluacion, i): Content[] => {
      const { configuracion: config, informe } = evaluacion;
      const cabecera = [
        title(`${i + 1}. ${config.nombre || config.producto.nombre}`),
        paragraph(`${config.producto.nombre} · ${config.metodologia.nombre} · Versión ${evaluacion.version} · ${fases[evaluacion.fase]}`),
      ];
      if (!informe) return [...cabecera, paragraph('Esta evaluación todavía no está consolidada: aún no hay problemas acordados.')];
      const resumen = resumirEvaluacion(informe.configuracion, informe.consenso);
      const nombreCriterio = (id: string) => informe.configuracion.metodologia.criterios.find((criterio) => criterio.id === id)?.nombre ?? id;
      const problemas = informe.consenso.hallazgos.filter((h) => h.decision === 'ACEPTADO').sort((a, b) => b.severidad - a.severidad);
      return [
        ...cabecera,
        paragraph(`${problemas.length} problemas acordados · ${informe.finalizadoEn ? `Finalizada el ${date(informe.finalizadoEn)}` : 'Informe preliminar, pendiente de cierre'}`),
        ...(problemas.length ? [
          table(['Severidad', 'Problemas'], severityLabels.map((label, level) => [`${level} · ${label}`, resumen.porSeveridad[level] ?? 0]), ['*', 90]),
          ...problemas.map((problema, index): Content => ({
            stack: [
              title(`Problema ${index + 1} · ${problema.titulo}`),
              { text: `SEVERIDAD ${problema.severidad} · ${severityLabels[problema.severidad] ?? 'Sin clasificar'} · PRIORIDAD ${problema.prioridad}`, bold: true, color: severityColors[problema.severidad] ?? INK, margin: [0, 0, 0, 8] },
              details([['Pantalla o tarea', problema.pantalla], ['Criterios', problema.criterioIds.map(nombreCriterio)], ['Problema', problema.descripcion], ['Recomendación', problema.recomendacion]]),
            ], unbreakable: JSON.stringify(problema).length < 1600,
          })),
        ] : [paragraph('La revisión acordada no identificó problemas de usabilidad.')]),
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

export function buildReportDefinition(report: ProjectReport, brand?: ReportBrand): TDocumentDefinitions {
  const blocks = sections(report);
  const counts: Record<ReportMethod, number> = {
    personas: report.personas?.length ?? 0, journey: report.journeys?.length ?? 0,
    momentos: report.moments?.length ?? 0, cards: report.cards?.length ?? 0, heuristica: report.heuristics?.length ?? 0,
  };
  const scope = report.methods.length === 5 ? 'INFORME COMPLETO' : 'INFORME POR TÉCNICAS';
  return {
    info: { title: `Informe UX · ${report.project.nombre}`, subject: report.methods.map(({ label }) => label).join(', '), creator: 'UXLab Observatorio' },
    pageSize: 'A4', pageMargins: PDF_PAGE_MARGINS,
    defaultStyle: PDF_DEFAULT_STYLE,
    images: brand ? { brandLogo: brand.logo, brandLogoWhite: brand.logoWhite } : {},
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
            { type: 'line', x1: 0, y1: 0, x2: id === 'journey' ? 733 : 487, y2: 0, lineWidth: .5, lineColor: '#b4bbc5' },
          ], margin: [0, 0, 0, 12] },
          ...(blocks[id].length ? [] : [empty()]),
        ], unbreakable: true, pageBreak: counts[id] || id === 'journey' || report.methods[index - 1]?.id === 'journey' ? 'before' : undefined, pageOrientation: id === 'journey' ? 'landscape' : 'portrait' },
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

export async function exportarReportePdf(report: ProjectReport): Promise<void> {
  const { pdfMake, brand } = await cargarPdfMake();
  const slug = report.project.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'proyecto';
  const scope = report.methods.length === 5 ? 'completo' : report.methods.map(({ id }) => id).join('-');
  await pdfMake.createPdf(buildReportDefinition(report, brand)).download(`observatorio-ux-${slug}-${scope}-${report.generatedAt.toISOString().slice(0, 10)}.pdf`);
}
