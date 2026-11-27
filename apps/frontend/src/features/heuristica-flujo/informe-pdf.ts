import type { AnotacionEvidencia, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { clasificarCriterios, escalaDe, origenHallazgo, resumirCumplimiento, resumirEvaluacion, SEVERIDADES } from '@observatorio-ux/shared-types';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { brandChrome, cargarPdfMake, date, MUTED, table, type ReportBrand } from '../../shared/utils/pdf';
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES, keepHeadingsWithContent, title, titleAccent } from '../../shared/utils/pdf-base';
import { cargarEvidenciaParaInforme } from './evidencia.api';
import { autoriaCaptura, autoriaHallazgo, notasCaptura, revisionInforme, textoCumplimiento } from './flujo-utils';
import { anclaMarca } from './anotaciones-interaccion';

const titulo = title;
/**
 * Título para bloques que ya abren hoja con `pageBreak: 'before'`: sin `headlineLevel`, porque
 * `keepHeadingsWithContent` lo toma por título huérfano dentro del bloque que no se parte y
 * agrega otro salto de página (una hoja en blanco).
 */
const tituloEnHoja = (text: string): Content => ({ stack: [{ text, style: 'subheading' }, titleAccent()], margin: [0, 16, 0, 8] });
const campo = (text: string, value: string): Content => ({ stack: [
  { text, fontSize: 8.5, bold: true, color: MUTED, margin: [0, 0, 0, 3] },
  { text: value || 'No registrado' },
], unbreakable: value.length < 600, margin: [0, 4, 0, 9] });

// Estimación del alto (pt) del texto en la hoja vertical, para decidir si la captura cabe
// junto a él: ancho útil 487 pt a 11 pt ≈ 80 caracteres por línea de 15 pt.
const ALTO_UTIL = 842 - 72 - 54;
const ALTO_TITULO = 48;
const altoTexto = (texto: string) => texto.split('\n').reduce((total, linea) => total + Math.max(1, Math.ceil(linea.length / 68)) * 16, 0);
/** Un bloque solo se declara indivisible si sobra holgura: si no cupiera en una hoja, pdfmake deja la anterior en blanco. */
const cabeEnUnaHoja = (alto: number) => alto < ALTO_UTIL - 140;
const altoCampos = (campos: Array<[string, string]>) => campos.reduce((total, [, valor]) => total + 26 + altoTexto(valor || 'No registrado'), 0);

/** `pies`: texto bajo cada captura (quién la subió y anotó, y cuándo), por id. */
type OpcionesInformePdf = { partes?: readonly string[]; pies?: ReadonlyMap<string, string>; /** Nombre de cada persona por id, para indicar quién hizo y quién revisó cada punto. */ nombres?: Readonly<Record<string, string>> };

function idsEvidencia(consenso: EvaluacionFlujo['consenso'] | undefined, { partes }: OpcionesInformePdf) {
  return new Set([
    ...(!partes || partes.includes('hallazgos') ? consenso?.hallazgos.filter(h => h.decision === 'ACEPTADO').flatMap(h => h.evidenciaIds) ?? [] : []),
    ...(!partes || partes.includes('mejoras') ? consenso?.mejoras?.flatMap(m => [...m.antesIds, ...m.despuesIds]) ?? [] : []),
    ...(!partes || partes.includes('positivos') ? consenso?.positivos?.flatMap(p => p.evidenciaIds ?? []) ?? [] : []),
  ]);
}

export function construirInformeFlujoPdf(evaluacion: EvaluacionFlujo, capturas: Map<string, string | null>, generadoEn: Date, brand?: ReportBrand, opciones: OpcionesInformePdf = {}): TDocumentDefinitions {
  if (!['CONSOLIDADA', 'FINALIZADA'].includes(evaluacion.fase) || !evaluacion.informe) throw new Error('Primero consolida y aprueba la evaluación.');
  const informe = evaluacion.informe;
  const config = informe.configuracion;
  const consenso = informe.consenso;
  const incluye = (parte: string) => opciones.partes?.includes(parte) ?? true;
  const resumen = resumirEvaluacion(config, consenso);
  const cumplimiento = resumirCumplimiento(config, consenso);
  const clases = clasificarCriterios(config, consenso);
  const grupos = (['desfavorable', 'favorable'] as const).flatMap(clase => {
    const criterios = config.metodologia.criterios.filter(c => clases.some(r => r.criterioId === c.id && r.clase === clase));
    return [titulo(`${clase === 'desfavorable' ? 'Criterios con problema' : 'Criterios cumplidos'} (${criterios.length})`), ...(criterios.length ? criterios.map(c => ({ text: c.nombre } as Content)) : [{ text: 'Sin criterios en este grupo.' } as Content])];
  });
  if (resumen.pendientes || !config.evaluadorIds.every(id => consenso.aprobadoPor.includes(id)) || consenso.hallazgos.some(h => h.decision === 'PENDIENTE')) throw new Error('El informe consolidado tiene decisiones o aprobaciones pendientes.');
  const hallazgos = consenso.hallazgos.filter(h => h.decision === 'ACEPTADO').slice().sort((a, b) => b.severidad - a.severidad);
  const nombreCriterio = (id: string) => config.metodologia.criterios.find(c => c.id === id)?.nombre ?? id;
  const valorCriterio = (r: typeof consenso.criterios[number]) => {
    const criterio = config.metodologia.criterios.find(c => c.id === r.criterioId);
    return r.noAplica ? `No aplica${r.motivo ? `: ${r.motivo}` : ''}` : (criterio ? escalaDe(config.metodologia, criterio) : config.metodologia.escala).niveles.find(n => n.id === r.valor)?.etiqueta ?? 'Pendiente';
  };
  const fuentes = [...new Set([config.metodologia.fuente, ...config.metodologia.criterios.map(c => c.origen.fuente)].map(f => (f ?? '').trim()).filter(Boolean))];
  const escalasPropias = [...new Map(config.metodologia.criterios.filter(c => c.escala).map(c => [JSON.stringify(c.escala), c.escala!] as const)).values()];
  const imagenes: Record<string, string> = {};
  const evidenciaIncluida = idsEvidencia(consenso, opciones);
  for (const [id, img] of capturas) if (img && evidenciaIncluida.has(id)) imagenes[`evidencia-${id}`] = img;
  const nombres = opciones.nombres ?? {};
  const revision = revisionInforme(evaluacion, nombres);
  const positivos = consenso.positivos ?? [];
  const mejoras = consenso.mejoras ?? [];
  const conclusion = (consenso.conclusion ?? '').trim();
  const finalizado = informe.finalizadoEn !== null;
  const pieCaptura = (id: string): Content[] => { const pie = opciones.pies?.get(id); return pie ? [{ text: pie, fontSize: 8, color: MUTED, margin: [0, -2, 0, 8] }] : []; };
  const imagenEvidencia = (id: string, alto = 310): Content => capturas.get(id)
    ? { stack: [{ image: `evidencia-${id}`, fit: [460, alto], margin: [0, 6, 0, 6] }, ...pieCaptura(id)], unbreakable: true }
    : { text: `Captura ${id} disponible en la aplicación (no se pudo cargar al generar este PDF; vuelve a generarlo para reintentar).`, color: MUTED, italics: true, margin: [0, 6, 0, 6] };
  /**
   * Texto con su primera captura en un bloque que no se parte (la captura se achica para
   * caber con el texto); las demás capturas siguen, cada una entera. Con texto muy largo
   * el bloque puede partirse y la captura va aparte.
   */
  const conCapturas = (texto: Content[], ids: string[], altoTexto: number, extra: Partial<Record<'pageBreak', 'before'>> = {}): Content[] => {
    const alto = Math.min(310, Math.floor(ALTO_UTIL - altoTexto - 90));
    const juntas = alto >= 150;
    const [primera, ...resto] = juntas ? ids : [];
    return [
      { stack: [...texto, ...(primera ? [imagenEvidencia(primera, alto)] : [])], unbreakable: cabeEnUnaHoja(altoTexto + (primera ? alto + 40 : 0)), ...extra },
      ...(juntas ? resto : ids).map(id => imagenEvidencia(id)),
    ];
  };
  // Un problema por hoja; la sección abre hoja nueva con el primero.
  const detalleHallazgos: Content[] = hallazgos.flatMap((h, i) => {
    const autor = autoriaHallazgo(evaluacion, h, nombres);
    const campos: Array<[string, string]> = [
      ['Severidad', `${h.severidad} · ${SEVERIDADES[h.severidad].etiqueta}`],
      ['Prioridad', h.prioridad], ['Pantalla o tarea', h.pantalla], ['Criterios', h.criterioIds.map(nombreCriterio).join('; ')],
      ['Problema', h.descripcion], ['Recomendación', h.recomendacion], ['Justificación del acuerdo', h.justificacion],
      ...(h.notas ? [['Notas', h.notas] as [string, string]] : []),
      ['Origen', `${origenHallazgo(h) === 'equipo' ? 'Nuevo del equipo' : 'Hallazgo individual'}${autor ? ` · ${autor}` : ''}`],
      ['Revisión', `Decidido por ${revision.redactor}${revision.confirmaron.length ? ` · Acuerdo confirmado por ${revision.confirmaron.join(', ')}` : ''}`],
    ];
    const titulos = [...(i === 0 ? ['Problemas y recomendaciones'] : []), `${i + 1}. ${h.titulo}`];
    return conCapturas(
      [...titulos.map(t => tituloEnHoja(t)), ...campos.map(([etiqueta, valor]) => campo(etiqueta, valor))],
      h.evidenciaIds, altoCampos(campos) + titulos.length * ALTO_TITULO, { pageBreak: 'before' },
    );
  });
  const sinCapturas: Content = { text: 'Sin capturas.', color: MUTED, margin: [0, 0, 0, 6] };
  // Cada mejora en hoja propia; «Antes» y «Después» van junto a su primera captura.
  const detalleMejoras: Content[] = mejoras.flatMap((m, i): Content[] => [
    { stack: [...(i === 0 ? [tituloEnHoja('Mejoras antes/después')] : []), tituloEnHoja(`${i + 1}. ${m.titulo}`), ...(m.descripcion ? [{ text: m.descripcion, margin: [0, 2, 0, 4] } as Content] : [])], pageBreak: 'before' },
    ...(['Antes', 'Después'] as const).flatMap((etiqueta): Content[] => {
      const ids = etiqueta === 'Antes' ? m.antesIds : m.despuesIds;
      const rotulo: Content = { text: etiqueta, bold: true, margin: [0, 4, 0, 2] };
      return ids.length ? conCapturas([rotulo], ids, 20) : [{ stack: [rotulo, sinCapturas], unbreakable: true }];
    }),
  ]);
  const detallePositivos: Content[] = positivos.flatMap((p, i) => conCapturas([
    ...(i === 0 ? [tituloEnHoja('Aspectos positivos')] : []),
    { text: p.titulo, bold: true, margin: [0, 6, 0, 2] },
    ...(p.descripcion ? [{ text: p.descripcion, margin: [0, 0, 0, 4] } as Content] : []),
    { text: `${p.autorId ? `Agregado por ${nombres[p.autorId] ?? 'una persona del equipo'}` : `Redactado por ${revision.redactor}`} · Revisado por ${revision.redactor}`, fontSize: 8.5, color: MUTED, margin: [0, 0, 0, 4] },
  ], p.evidenciaIds ?? [], (i === 0 ? ALTO_TITULO : 0) + 24 + altoTexto(p.descripcion ?? ''), i === 0 ? { pageBreak: 'before' } : {}));
  return {
    info: { title: `Evaluación heurística · ${config.nombre} · v${informe.version}`, creator: 'UXLab Observatorio', subject: 'Informe consolidado de evaluación heurística' },
    pageSize: 'A4', pageMargins: PDF_PAGE_MARGINS, defaultStyle: PDF_DEFAULT_STYLE,
    images: { ...(brand ? { brandLogo: brand.logo, brandLogoWhite: brand.logoWhite } : {}), ...imagenes },
    ...brandChrome(brand, 'EVALUACIÓN HEURÍSTICA', generadoEn),
    content: [
      { text: finalizado ? 'Informe final' : 'Informe preliminar consolidado', style: 'eyebrow', alignment: 'center', margin: [0, 36, 0, 18] },
      { text: config.nombre, style: 'coverTitle' },
      { columns: [campo('Versión del informe', String(informe.version)), campo('Producto', `${config.producto.nombre} · ${config.producto.version}`)], columnGap: 20 },
      { columns: [campo('Clave del producto', config.producto.clave), campo('Enlace del producto', config.producto.url), campo('Dispositivo', config.producto.dispositivo)], columnGap: 20 },
      campo('Objetivo', config.objetivo), campo('Tareas', config.tareas),
      { columns: [campo('Pantallas incluidas', config.pantallas), campo('Exclusiones', config.exclusiones || 'Ninguna declarada')], columnGap: 20 },
      { columns: [campo('Metodología', `${config.metodologia.nombre} · ${config.metodologia.version}`), campo('Autoría', config.metodologia.autor)], columnGap: 20 },
      ...(incluye('resumen') ? [campo('Evaluadores', informe.evaluadores.map(e => e.nombre).join(', '))] : []),
      ...(incluye('resumen') && informe.evaluadores.length === 1 ? [campo('Alcance', 'Una sola persona evaluadora: no hay comparación entre evaluadores.')] : []),
      { columns: [campo('Inicio', informe.iniciadoEn ? date(informe.iniciadoEn) : 'No registrado'), campo('Consolidación', date(informe.consolidadoEn)), campo('Cierre', informe.finalizadoEn ? date(informe.finalizadoEn) : 'Pendiente de cierre'), campo('Exportación', date(generadoEn))], columnGap: 16 },
      ...(incluye('criterios') ? [
        { stack: [tituloEnHoja('Escala de valoración')], pageBreak: 'before' } as Content,
        campo('Tipo y sentido', `${config.metodologia.escala.tipo} · ${config.metodologia.escala.sentido}`), 
        table(['Respuesta', 'Significado', 'Valor'], config.metodologia.escala.niveles.map(n => [n.etiqueta, n.significado, n.valor ?? 'Sin puntaje']), [100, '*', 70]),
        ...escalasPropias.flatMap((e): Content[] => [
          campo('Escala propia de algunos criterios', `${e.tipo} · ${e.sentido}`),
          table(['Respuesta', 'Significado', 'Valor'], e.niveles.map(n => [n.etiqueta, n.significado, n.valor ?? 'Sin puntaje']), [100, '*', 70]),
        ]),
      ] : []),
      ...(incluye('resumen') ? [
        titulo('Cobertura y resultados'),
        table(['Criterios evaluados', 'No aplica', 'Pendientes', 'Hallazgos aceptados para mejorar'], [[resumen.evaluados, resumen.noAplica, resumen.pendientes, resumen.totalHallazgos]]),
        table([resumen.porEscala.length ? 'Valoración (escala de la metodología)' : 'Valoración del criterio', 'Cantidad'], resumen.porCategoria.map(n => [n.etiqueta, n.count]), ['*', 90]),
        ...resumen.porEscala.map((g, i) => table([`Valoración (escala propia ${i + 1})`, 'Cantidad'], g.distribucion.map(n => [n.etiqueta, n.count]), ['*', 90])),
        table(['Severidad del problema', 'Cantidad'], SEVERIDADES.map(n => [`${n.valor} · ${n.etiqueta}`, resumen.porSeveridad[n.valor]]), ['*', 90]),
        { text: 'No aplica y sin evaluar quedan fuera del cálculo. La severidad es ordinal: se informa por distribución, sin asumir distancias iguales entre niveles.', color: MUTED },
        ...(resumen.formula ? [campo('Fórmula del índice', resumen.formula), campo('Denominador (suma de pesos aplicables evaluados)', String(resumen.denominador)), campo('Índice', resumen.indice === null ? 'No calculable' : String(Math.round(resumen.indice * 1000) / 1000))] : []),
      ] : []),
      ...(incluye('cumplimiento') && cumplimiento ? [titulo('Cumplimiento'), table(['Categoría', 'Cumplimiento'], [...cumplimiento.porCategoria.map(c => [c.categoria, textoCumplimiento(c)]), ['Total', textoCumplimiento(cumplimiento.total)]], ['*', '*']), { text: 'El porcentaje compara aciertos y problemas. No incluye respuestas neutras, sin evaluar ni «No aplica».', color: MUTED } as Content] : []),
      ...(incluye('criterios') ? [
        ...grupos, { text: `${resumen.noAplica} no aplican. Los criterios neutros y sin evaluar quedan fuera de ambos grupos.` },
        titulo('Criterios y decisiones acordadas'),
        table(['Criterio', 'Valoración final', 'Justificación'], consenso.criterios.map(r => [nombreCriterio(r.criterioId), valorCriterio(r), r.justificacion]), ['*', 100, '*']),
      ] : []),
      ...(incluye('positivos') ? detallePositivos : []),
      ...(incluye('hallazgos') ? (detalleHallazgos.length ? detalleHallazgos : [titulo('Problemas y recomendaciones'), { text: 'La revisión acordada no identificó problemas de usabilidad.' } as Content]) : []),
      ...(incluye('mejoras') ? detalleMejoras : []),
      ...(incluye('conclusion') && conclusion ? [titulo('Conclusión y recomendaciones finales'), { text: conclusion } as Content] : []),
      ...(incluye('resumen') ? [
        titulo('Decisiones de revisión'),
        table(['Problema', 'Decisión', 'Origen y autoría', 'Motivo'], consenso.hallazgos.map(h => [h.titulo, h.decision === 'ACEPTADO' ? 'Aceptado / fusionado' : 'Descartado', [origenHallazgo(h) === 'equipo' ? 'Nuevo del equipo' : 'Hallazgo individual', autoriaHallazgo(evaluacion, h, nombres)].filter(Boolean).join(' · '), h.justificacion]), ['*', 90, 110, '*']),
        campo('Aprobación explícita', informe.evaluadores.filter(e => consenso.aprobadoPor.includes(e.id)).map(e => e.nombre).join(', ')),
      ] : []),
      // Una sola referencia al final: de ahí provienen las preguntas (no se repite en cada criterio).
      ...(fuentes.length ? [titulo('Fuente de las preguntas'), { text: `Las preguntas de esta evaluación provienen de: ${fuentes.join(' · ')}`, color: MUTED } as Content] : []),
    ],
    styles: PDF_STYLES,
    pageBreakBefore: keepHeadingsWithContent,
  };
}

/** Círculo numerado en el ancla de la marca (esquina superior izquierda o inicio de la flecha). */
export function dibujarNumero(ctx: CanvasRenderingContext2D, a: AnotacionEvidencia, n: number, width: number, height: number) {
  const { x, y } = anclaMarca(a);
  const r = Math.max(11, width / 70);
  const cx = Math.min(width - r, Math.max(r, x * width)), cy = Math.min(height - r, Math.max(r, y * height));
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = a.color; ctx.fill();
  ctx.lineWidth = Math.max(2, r / 5); ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(n), cx, cy + 1);
  ctx.restore();
}

export function dibujarAnotacion(ctx: CanvasRenderingContext2D, a: AnotacionEvidencia, width: number, height: number) {
  const x = Math.min(a.x, a.x2) * width, y = Math.min(a.y, a.y2) * height;
  const w = Math.abs(a.x2 - a.x) * width, h = Math.abs(a.y2 - a.y) * height;
  ctx.save(); ctx.strokeStyle = a.color; ctx.fillStyle = a.color; ctx.lineWidth = Math.max(2, width / 250);
  if (a.tipo === 'rectangulo') ctx.strokeRect(x, y, w, h);
  else if (a.tipo === 'circulo') { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
  else if (a.tipo === 'destacado') { ctx.globalAlpha = 0.3; ctx.fillRect(x, y, w, h); }
  else if (a.tipo === 'texto') { ctx.font = `${Math.max(12, width / 40)}px sans-serif`; ctx.fillText(a.texto, a.x * width, a.y * height); }
  else { const x1 = a.x * width, y1 = a.y * height, x2 = a.x2 * width, y2 = a.y2 * height; const angle = Math.atan2(y2 - y1, x2 - x1); const size = Math.max(10, width / 40); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6)); ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

/** Lado máximo de la captura en el PDF: más grande solo pesa (y puede agotar la memoria del navegador) sin verse mejor en A4. */
const LADO_MAX_CAPTURA = 2400;

/** Decodifica la imagen con `createImageBitmap` y, si el navegador no puede, con un `<img>` (p. ej. formatos que el primero rechaza). */
async function decodificar(blob: Blob): Promise<{ origen: CanvasImageSource; ancho: number; alto: number; cerrar: () => void }> {
  try {
    const bitmap = await createImageBitmap(blob);
    return { origen: bitmap, ancho: bitmap.width, alto: bitmap.height, cerrar: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((ok, fallo) => { img.onload = () => ok(); img.onerror = () => fallo(new Error('No se pudo leer la captura.')); img.src = url; });
      return { origen: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => URL.revokeObjectURL(url) };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  }
}

export async function rasterizarEvidencia(blob: Blob, anotaciones: AnotacionEvidencia[]): Promise<string> {
  const img = await decodificar(blob);
  try {
    if (!img.ancho || !img.alto) throw new Error('La captura está vacía.');
    const factor = Math.min(1, LADO_MAX_CAPTURA / Math.max(img.ancho, img.alto));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.ancho * factor)); canvas.height = Math.max(1, Math.round(img.alto * factor));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No se pudo preparar la captura para el PDF.');
    // Fondo blanco: en JPEG la transparencia sería negra.
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img.origen, 0, 0, canvas.width, canvas.height);
    anotaciones.forEach(a => dibujarAnotacion(ctx, a, canvas.width, canvas.height));
    // Número de cada marca (como en la app), para leer su nota en el pie de la captura.
    anotaciones.forEach((a, i) => { if (a.tipo !== 'texto') dibujarNumero(ctx, a, i + 1, canvas.width, canvas.height); });
    return canvas.toDataURL('image/jpeg', 0.88);
  } finally { img.cerrar(); }
}

/** Devuelve cuántas capturas no se pudieron cargar (el PDF las indica en su lugar). */
export async function exportarInformeFlujoPdf(proyectoId: string, evaluacion: EvaluacionFlujo, opciones: OpcionesInformePdf = {}): Promise<{ capturasFallidas: number }> {
  const capturas = new Map<string, string | null>();
  const pies = new Map<string, string>();
  const ids = idsEvidencia(evaluacion.informe?.consenso, opciones);
  for (const id of ids) {
    try {
      const { meta, blob } = await cargarEvidenciaParaInforme(proyectoId, evaluacion.id, id);
      capturas.set(id, await rasterizarEvidencia(blob, meta?.anotaciones ?? []));
      if (meta) pies.set(id, [autoriaCaptura(meta), notasCaptura(meta.anotaciones)].filter(Boolean).join('\n'));
    } catch { capturas.set(id, null); }
  }
  const { pdfMake, brand } = await cargarPdfMake();
  const nombre = evaluacion.informe?.configuracion.nombre ?? 'evaluacion';
  const slug = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  await pdfMake.createPdf(construirInformeFlujoPdf(evaluacion, capturas, new Date(), brand, { ...opciones, pies })).download(`heuristica-${slug}-v${evaluacion.informe?.version ?? 1}.pdf`);
  return { capturasFallidas: [...capturas.values()].filter(c => !c).length };
}
