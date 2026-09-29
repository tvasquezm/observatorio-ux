import type { Content, ContentCanvas, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ProjectReport, ReportMethod } from '../../features/reports/report-data';

const INK = '#1f2d4a';
const TEAL = '#3049b2';
const MUTED = '#526a73';
type ReportBrand = { logo: string; logoWhite: string };

// Vector rectangles keep the brand gradient sharp in print, without a raster background.
function brandBand(width: number, height: number): ContentCanvas {
  return { canvas: [...Array.from({ length: 128 }, (_, index) => {
    const progress = index / 127;
    const color = [21, 32, 56].map((start, channel) => Math.round(start + ([38, 59, 196][channel] - start) * progress).toString(16).padStart(2, '0')).join('');
    return { type: 'rect' as const, x: index * width / 128, y: 0, w: width / 128 + 0.1, h: height, color: `#${color}`, lineWidth: 0 };
  }), { type: 'rect', x: 0, y: height - 3, w: width, h: 3, color: '#a7c51f', lineWidth: 0 }] };
}
const severityLabels = ['Sin problema', 'Cosmético', 'Menor', 'Mayor', 'Crítico'];
const severityColors = ['#526a73', '#526a73', '#85601b', '#a44626', '#922f3d'];
const textValue = (value: unknown): string => Array.isArray(value) ? value.join('\n') || 'No registrado' : value == null || value === '' ? 'No registrado' : String(value);
const date = (value: string | Date): string => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value));
const title = (text: string): Content => ({ text, style: 'subheading', margin: [0, 16, 0, 8], headlineLevel: 2 });
const paragraph = (text: string): Content => ({ text, margin: [0, 0, 0, 8] });
const empty = (): Content => ({ text: 'Sin registros guardados para esta técnica dentro de tu acceso actual.', color: MUTED, italics: true, margin: [0, 16, 0, 12] });

function table(headers: string[], rows: unknown[][], widths?: Array<string | number>): Content {
  return {
    table: {
      headerRows: 1,
      widths: widths ?? headers.map(() => '*'),
      body: [
        headers.map((text) => ({ text, bold: true, color: '#ffffff', fillColor: INK, fontSize: 9 })),
        ...rows.map((row, index) => row.map((value) => ({ text: textValue(value), fillColor: index % 2 ? '#ffffff' : '#f3f5f9' }))),
      ],
    },
    layout: {
      hLineWidth: () => 0, vLineWidth: () => 0,
      paddingLeft: () => 9, paddingRight: () => 9,
      paddingTop: () => 6, paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 12],
  };
}

function details(rows: Array<[string, unknown]>): Content {
  return {
    table: { widths: [118, '*'], body: rows.map(([label, value]) => [
      { text: label, bold: true, color: MUTED, fontSize: 9 },
      { text: textValue(value) },
    ]) },
    layout: {
      hLineWidth: (index) => index === 0 ? 0 : 0.5,
      hLineColor: () => '#d7dde7', vLineWidth: () => 0,
      paddingLeft: () => 0, paddingRight: () => 14,
      paddingTop: () => 7, paddingBottom: () => 7,
    }, margin: [0, 0, 0, 12],
  };
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
      ]),
    ]) ?? [],
    journey: report.journeys?.flatMap(({ contenido: journey, version }, i) => [
      title(`${i + 1}. Recorrido de ${journey.perfilUsuario.nombre}`),
      paragraph(`${journey.perfilUsuario.rol} · Versión ${version} · ${journey.fases.length} fases`),
      table(['Fase', 'Puntos de contacto', 'Pensamientos', 'Emoción', 'Oportunidades'], journey.fases.map((phase, index) => [
        `${index + 1}. ${phase.nombre}`, phase.touchpoints, phase.pensamientos, phase.emocion, phase.oportunidades,
      ]), [80, '*', '*', 55, '*']),
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
          title('Distribución por tarjeta'),
          table(['Tarjeta', 'Categoría', 'Asignaciones'], analytics.porCarta.flatMap((card) => card.categorias.length ? card.categorias.map((category) => [card.tarjeta, category.nombre, category.frecuencia]) : [[card.tarjeta, 'Sin asignaciones', 0]]), ['*', '*', 75]),
          ...(analytics.clusters.length ? [title('Agrupaciones sugeridas'), table(['Grupo', 'Tarjetas', 'Acuerdo'], analytics.clusters.map((cluster) => [cluster.nombre, cluster.tarjetas, `${cluster.acuerdo}%`]), [100, '*', 60])] : []),
        ], unbreakable: JSON.stringify([analytics.porCarta, analytics.clusters]).length < 1600,
      } as Content] : [paragraph('Aún no hay respuestas completadas para calcular resultados.')]),
    ]) ?? [],
    heuristica: report.heuristics?.flatMap((session, i) => {
      const findings = Array.isArray(session.resultado) ? session.resultado : [];
      return [
        title(`${i + 1}. Evaluación del ${date(session.createdAt)}`),
        paragraph(`${session.estado === 'COMPLETADO' ? 'Completada' : 'En curso'} · ${findings.length} hallazgos${session.completadoAt ? ` · Finalizada el ${date(session.completadoAt)}` : ''}`),
        ...(findings.length ? [
          table(['Severidad', 'Hallazgos'], severityLabels.map((label, level) => [`${level} · ${label}`, findings.filter((finding) => finding.severidad === level).length]), ['*', 90]),
          ...[...findings].sort((a, b) => b.severidad - a.severidad).map((finding, index): Content => ({
            stack: [
              title(`Hallazgo ${index + 1} · ${finding.heuristicaId}`),
              { text: `SEVERIDAD ${finding.severidad} · ${severityLabels[finding.severidad] ?? 'Sin clasificar'}`, bold: true, color: severityColors[finding.severidad] ?? INK, margin: [0, 0, 0, 8] },
              details([['Descripción', finding.descripcion], ['Evidencia', finding.evidencia], ['Recomendación', finding.recomendacion]]),
            ], unbreakable: JSON.stringify(finding).length < 1600,
          })),
        ] : [paragraph('Esta sesión todavía no contiene hallazgos.')]),
      ];
    }) ?? [],
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
    pageSize: 'A4', pageMargins: [44, 66, 44, 54],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.2, color: INK },
    images: brand ? { brandLogo: brand.logo, brandLogoWhite: brand.logoWhite } : {},
    background: (page, size) => page === 1 ? brandBand(size.width, 156) : null,
    header: (page) => page === 1 ? {
      stack: [
        brand ? { image: 'brandLogoWhite', width: 268 } : { text: 'UXLab Observatorio', color: '#ffffff', bold: true, fontSize: 24 },
      ], margin: [44, 40, 44, 0],
    } : {
      columns: [
        brand ? { image: 'brandLogo', width: 124 } : { text: 'UXLAB / OBSERVATORIO', color: TEAL, bold: true, fontSize: 9 },
        { text: scope, alignment: 'right', fontSize: 8, color: MUTED, margin: [0, 10, 0, 0] },
      ], margin: [44, 28, 44, 0],
    },
    footer: (page, total) => ({
      columns: [
        { text: `Evidencia de investigación · ${date(report.generatedAt)}`, fontSize: 8, color: MUTED },
        { text: `${page} / ${total}`, alignment: 'right', fontSize: 8, color: MUTED },
      ], margin: [44, 18, 44, 0],
    }),
    content: [
      { text: 'INFORME DE INVESTIGACIÓN UX', style: 'eyebrow', margin: [0, 116, 0, 12] },
      { text: report.project.nombre, fontSize: 32, bold: true, lineHeight: 1.08, margin: [0, 0, 0, 16] },
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
        { text: `SECCIÓN 0${index + 1}`, style: 'eyebrow', pageBreak: 'before', pageOrientation: id === 'journey' ? 'landscape' : 'portrait', margin: [0, 10, 0, 12] },
        { text: label, fontSize: 27, bold: true, margin: [0, 0, 0, 8] },
        { text: detail, color: MUTED, margin: [0, 0, 0, 18] },
        { canvas: [
          { type: 'rect', x: 0, y: 0, w: id === 'journey' ? 754 : 507, h: 1, color: '#d7dde7' },
          { type: 'rect', x: 0, y: 0, w: 36, h: 3, color: '#a7c51f' },
        ], margin: [0, 0, 0, 12] },
        ...(blocks[id].length ? blocks[id] : [empty()]),
      ]),
    ],
    styles: { subheading: { fontSize: 14, bold: true, color: INK }, eyebrow: { fontSize: 9, bold: true, color: TEAL, characterSpacing: 1 } },
    pageBreakBefore: (node, container) => Boolean(node.headlineLevel && !container.getFollowingNodesOnPage().length),
  };
}

async function loadBrandImage(path: string): Promise<string> {
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

export async function exportarReportePdf(report: ProjectReport): Promise<void> {
  const [pdfMakeModule, fontContainerModule, logo, logoWhite] = await Promise.all([
    import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts'),
    loadBrandImage('/brand/uxlab-observatorio.png'), loadBrandImage('/brand/uxlab-observatorio-white.png'),
  ]);
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
  pdfMake.addVirtualFileSystem(fontContainerModule.default ?? fontContainerModule);
  pdfMake.addFonts({ Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' } });
  const slug = report.project.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'proyecto';
  const scope = report.methods.length === 5 ? 'completo' : report.methods.map(({ id }) => id).join('-');
  await pdfMake.createPdf(buildReportDefinition(report, { logo, logoWhite })).download(`observatorio-ux-${slug}-${scope}-${report.generatedAt.toISOString().slice(0, 10)}.pdf`);
}
