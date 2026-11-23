import type { AnotacionEvidencia, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { clasificarCriterios, escalaDe, origenHallazgo, resumirCumplimiento, resumirEvaluacion, SEVERIDADES } from '@observatorio-ux/shared-types';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { brandChrome, cargarPdfMake, date, MUTED, table, type ReportBrand } from '../../shared/utils/pdf';
import { PDF_DEFAULT_STYLE, PDF_PAGE_MARGINS, PDF_STYLES, keepHeadingsWithContent, title } from '../../shared/utils/pdf-base';
import { cargarEvidencia } from './evidencia.api';
import { autoriaCaptura, notasCaptura, textoCumplimiento } from './flujo-utils';
import { anclaMarca } from './anotaciones-interaccion';

const titulo = title;
const campo = (text: string, value: string): Content => ({ stack: [
  { text, fontSize: 8.5, bold: true, color: MUTED, margin: [0, 0, 0, 3] },
  { text: value || 'No registrado' },
], unbreakable: value.length < 600, margin: [0, 4, 0, 9] });

/** `pies`: texto bajo cada captura (quién la subió y anotó, y cuándo), por id. */
type OpcionesInformePdf = { partes?: readonly string[]; pies?: ReadonlyMap<string, string> };

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
  const positivos = consenso.positivos ?? [];
  const mejoras = consenso.mejoras ?? [];
  const conclusion = (consenso.conclusion ?? '').trim();
  const finalizado = informe.finalizadoEn !== null;
  const pieCaptura = (id: string): Content[] => { const pie = opciones.pies?.get(id); return pie ? [{ text: pie, fontSize: 8, color: MUTED, margin: [0, -2, 0, 8] }] : []; };
  const imagenEvidencia = (id: string): Content => capturas.get(id)
    ? { stack: [{ image: `evidencia-${id}`, fit: [460, 310], margin: [0, 6, 0, 6] }, ...pieCaptura(id)], unbreakable: true }
    : { text: `Captura ${id} disponible en la aplicación (no incluida en este PDF).`, color: MUTED, italics: true };
  const detalleHallazgos: Content[] = hallazgos.flatMap((h, i) => [
    titulo(`${i + 1}. ${h.titulo}`),
    campo('Severidad', `${h.severidad} · ${SEVERIDADES[h.severidad].etiqueta}`),
    campo('Prioridad', h.prioridad), campo('Pantalla o tarea', h.pantalla), campo('Criterios', h.criterioIds.map(nombreCriterio).join('; ')),
    campo('Problema', h.descripcion), campo('Recomendación', h.recomendacion), campo('Justificación del acuerdo', h.justificacion),
    ...(h.notas ? [campo('Notas', h.notas)] : []),
    campo(origenHallazgo(h) === 'equipo' ? 'Origen' : 'Hallazgos individuales de origen', origenHallazgo(h) === 'equipo' ? 'Nuevo del equipo' : h.origenIds.join(', ')),
    ...h.evidenciaIds.map(imagenEvidencia),
  ]);
  const detalleMejoras: Content[] = mejoras.flatMap((m, i): Content[] => [
    titulo(`${i + 1}. ${m.titulo}`),
    ...(m.descripcion ? [{ text: m.descripcion, margin: [0, 2, 0, 4] } as Content] : []),
    { text: 'Antes', bold: true, margin: [0, 4, 0, 2] }, ...(m.antesIds.length ? m.antesIds.map(imagenEvidencia) : [{ text: 'Sin capturas.', color: MUTED } as Content]),
    { text: 'Después', bold: true, margin: [0, 4, 0, 2] }, ...(m.despuesIds.length ? m.despuesIds.map(imagenEvidencia) : [{ text: 'Sin capturas.', color: MUTED } as Content]),
  ]);
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
      { columns: [campo('Inicio', informe.iniciadoEn ? date(informe.iniciadoEn) : 'No registrado'), campo('Consolidación', date(informe.consolidadoEn)), campo('Cierre', informe.finalizadoEn ? date(informe.finalizadoEn) : 'Pendiente de cierre'), campo('Exportación', date(generadoEn))], columnGap: 16 },
      ...(incluye('criterios') ? [
        { stack: [titulo('Escala de valoración')], pageBreak: 'before' } as Content,
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
      ...(incluye('positivos') && positivos.length ? [titulo('Aspectos positivos'), ...positivos.flatMap((p): Content[] => [{ text: p.titulo, bold: true, margin: [0, 6, 0, 2] }, ...(p.descripcion ? [{ text: p.descripcion, margin: [0, 0, 0, 4] } as Content] : []), ...(p.evidenciaIds ?? []).map(imagenEvidencia)])] : []),
      ...(incluye('hallazgos') ? [titulo('Problemas y recomendaciones'), ...(detalleHallazgos.length ? detalleHallazgos : [{ text: 'La revisión acordada no identificó problemas de usabilidad.' } as Content])] : []),
      ...(incluye('mejoras') && mejoras.length ? [titulo('Mejoras antes/después'), ...detalleMejoras] : []),
      ...(incluye('conclusion') && conclusion ? [titulo('Conclusión y recomendaciones finales'), { text: conclusion } as Content] : []),
      ...(incluye('resumen') ? [
        titulo('Decisiones de revisión'),
        table(['Problema', 'Decisión', 'Orígenes', 'Motivo'], consenso.hallazgos.map(h => [h.titulo, h.decision === 'ACEPTADO' ? 'Aceptado / fusionado' : 'Descartado', origenHallazgo(h) === 'equipo' ? 'Nuevo del equipo' : h.origenIds.join(', '), h.justificacion]), ['*', 90, 90, '*']),
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

export async function rasterizarEvidencia(blob: Blob, anotaciones: AnotacionEvidencia[]): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const factor = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * factor)); canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No se pudo preparar la captura para el PDF.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    anotaciones.forEach(a => dibujarAnotacion(ctx, a, canvas.width, canvas.height));
    // Número de cada marca (como en la app), para leer su nota en el pie de la captura.
    anotaciones.forEach((a, i) => { if (a.tipo !== 'texto') dibujarNumero(ctx, a, i + 1, canvas.width, canvas.height); });
    return canvas.toDataURL('image/png');
  } finally { bitmap.close(); }
}

export async function exportarInformeFlujoPdf(proyectoId: string, evaluacion: EvaluacionFlujo, opciones: OpcionesInformePdf = {}): Promise<void> {
  const capturas = new Map<string, string | null>();
  const pies = new Map<string, string>();
  const ids = idsEvidencia(evaluacion.informe?.consenso, opciones);
  for (const id of ids) {
    try { const { meta, blob } = await cargarEvidencia(proyectoId, evaluacion.id, id); capturas.set(id, await rasterizarEvidencia(blob, meta.anotaciones)); pies.set(id, [autoriaCaptura(meta), notasCaptura(meta.anotaciones)].filter(Boolean).join('\n')); }
    catch { capturas.set(id, null); }
  }
  const { pdfMake, brand } = await cargarPdfMake();
  const nombre = evaluacion.informe?.configuracion.nombre ?? 'evaluacion';
  const slug = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  await pdfMake.createPdf(construirInformeFlujoPdf(evaluacion, capturas, new Date(), brand, { ...opciones, pies })).download(`heuristica-${slug}-v${evaluacion.informe?.version ?? 1}.pdf`);
}
