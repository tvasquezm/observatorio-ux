import type { AnotacionEvidencia, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { resumirEvaluacion, SEVERIDADES } from '@observatorio-ux/shared-types';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { brandChrome, cargarPdfMake, date, INK, MUTED, table, TEAL, type ReportBrand } from '../../shared/utils/pdf';
import { cargarEvidencia } from './evidencia.api';

const titulo = (text: string): Content => ({ text, fontSize: 14, bold: true, margin: [0, 18, 0, 8], color: TEAL });
const campo = (text: string, value: string): Content => ({ text: `${text}: ${value || 'No registrado'}`, margin: [0, 2, 0, 4] });

export function construirInformeFlujoPdf(evaluacion: EvaluacionFlujo, capturas: Map<string, string | null>, generadoEn: Date, brand?: ReportBrand): TDocumentDefinitions {
  if (!['CONSOLIDADA', 'FINALIZADA'].includes(evaluacion.fase) || !evaluacion.informe) throw new Error('Primero consolida y aprueba la evaluación.');
  const informe = evaluacion.informe;
  const config = informe.configuracion;
  const consenso = informe.consenso;
  const resumen = resumirEvaluacion(config, consenso);
  if (resumen.pendientes || !config.evaluadorIds.every(id => consenso.aprobadoPor.includes(id)) || consenso.hallazgos.some(h => h.decision === 'PENDIENTE')) throw new Error('El informe consolidado tiene decisiones o aprobaciones pendientes.');
  const hallazgos = consenso.hallazgos.filter(h => h.decision === 'ACEPTADO').slice().sort((a, b) => b.severidad - a.severidad);
  const nombreCriterio = (id: string) => config.metodologia.criterios.find(c => c.id === id)?.nombre ?? id;
  const valorCriterio = (r: typeof consenso.criterios[number]) => r.noAplica ? `No aplica: ${r.motivo}` : config.metodologia.escala.niveles.find(n => n.id === r.valor)?.etiqueta ?? 'Pendiente';
  const imagenes: Record<string, string> = {};
  for (const [id, img] of capturas) if (img) imagenes[`evidencia-${id}`] = img;
  const finalizado = informe.finalizadoEn !== null;
  const detalleHallazgos: Content[] = hallazgos.flatMap((h, i) => [
    titulo(`${i + 1}. ${h.titulo}`),
    campo('Severidad', `${h.severidad} · ${SEVERIDADES[h.severidad].etiqueta}`),
    campo('Prioridad', h.prioridad), campo('Pantalla o tarea', h.pantalla), campo('Criterios', h.criterioIds.map(nombreCriterio).join('; ')),
    campo('Problema', h.descripcion), campo('Recomendación', h.recomendacion), campo('Justificación del acuerdo', h.justificacion),
    ...(h.notas ? [campo('Notas', h.notas)] : []),
    campo('Hallazgos individuales de origen', h.origenIds.join(', ')),
    ...h.evidenciaIds.map(id => capturas.get(id) ? { image: `evidencia-${id}`, fit: [460, 310], margin: [0, 6, 0, 6] } as Content : { text: `Captura ${id} disponible en la aplicación (no incluida en este PDF).`, color: MUTED, italics: true } as Content),
  ]);
  return {
    info: { title: `Evaluación heurística · ${config.nombre} · v${informe.version}`, creator: 'UXLab Observatorio', subject: 'Informe consolidado de evaluación heurística' },
    pageSize: 'A4', pageMargins: [44, 66, 44, 54], defaultStyle: { font: 'Roboto', fontSize: 9.5, color: INK, lineHeight: 1.2 },
    images: { ...(brand ? { brandLogo: brand.logo, brandLogoWhite: brand.logoWhite } : {}), ...imagenes },
    ...brandChrome(brand, 'EVALUACIÓN HEURÍSTICA', generadoEn),
    content: [
      { text: finalizado ? 'Informe final' : 'Informe preliminar consolidado', style: 'eyebrow', margin: [0, 100, 0, 12] },
      { text: config.nombre, fontSize: 25, bold: true, margin: [0, 0, 0, 12] },
      campo('Versión del informe', String(informe.version)), campo('Producto', `${config.producto.nombre} · ${config.producto.version}`),
      campo('Clave del producto', config.producto.clave), campo('Enlace del producto', config.producto.url), campo('Dispositivo', config.producto.dispositivo),
      campo('Objetivo', config.objetivo), campo('Tareas', config.tareas), campo('Pantallas incluidas', config.pantallas), campo('Exclusiones', config.exclusiones || 'Ninguna declarada'),
      campo('Metodología', `${config.metodologia.nombre} · ${config.metodologia.version}`), campo('Autoría', config.metodologia.autor), campo('Fuente', config.metodologia.fuente),
      campo('Evaluadores', informe.evaluadores.map(e => e.nombre).join(', ')), campo('Inicio', informe.iniciadoEn ? date(informe.iniciadoEn) : 'No registrado'),
      campo('Consolidación', date(informe.consolidadoEn)), campo('Cierre', informe.finalizadoEn ? date(informe.finalizadoEn) : 'Pendiente de cierre'), campo('Exportación', date(generadoEn)),
      titulo('Escala de valoración'),
      campo('Tipo y sentido', `${config.metodologia.escala.tipo} · ${config.metodologia.escala.sentido}`), campo('Origen de la escala', config.metodologia.escala.fuente),
      table(['Respuesta', 'Significado', 'Valor'], config.metodologia.escala.niveles.map(n => [n.etiqueta, n.significado, n.valor ?? 'Sin puntaje']), [100, '*', 70]),
      titulo('Cobertura y resultados'),
      table(['Criterios evaluados', 'No aplica justificado', 'Pendientes', 'Problemas únicos'], [[resumen.evaluados, resumen.noAplica, resumen.pendientes, resumen.totalHallazgos]]),
      table(['Valoración del criterio', 'Cantidad'], resumen.porCategoria.map(n => [n.etiqueta, n.count]), ['*', 90]),
      table(['Severidad del problema', 'Cantidad'], SEVERIDADES.map(n => [`${n.valor} · ${n.etiqueta}`, resumen.porSeveridad[n.valor]]), ['*', 90]),
      { text: 'No aplica y sin evaluar quedan fuera del cálculo. La severidad es ordinal: se informa por distribución, sin asumir distancias iguales entre niveles.', color: MUTED },
      ...(resumen.formula ? [campo('Fórmula del índice', resumen.formula), campo('Denominador (suma de pesos aplicables evaluados)', String(resumen.denominador)), campo('Índice', resumen.indice === null ? 'No calculable' : String(Math.round(resumen.indice * 1000) / 1000))] : []),
      titulo('Criterios y decisiones acordadas'),
      table(['Criterio / fuente', 'Valoración final', 'Justificación'], consenso.criterios.map(r => { const c = config.metodologia.criterios.find(x => x.id === r.criterioId); return [`${nombreCriterio(r.criterioId)}\n${c?.origen.autor ?? ''} · ${c?.origen.version ?? ''}\n${c?.origen.fuente ?? ''}`, valorCriterio(r), r.justificacion]; }), ['*', 100, '*']),
      titulo('Problemas y recomendaciones'), ...(detalleHallazgos.length ? detalleHallazgos : [{ text: 'La revisión acordada no identificó problemas de usabilidad.' } as Content]),
      titulo('Decisiones de revisión'),
      table(['Problema', 'Decisión', 'Orígenes', 'Motivo'], consenso.hallazgos.map(h => [h.titulo, h.decision === 'ACEPTADO' ? 'Aceptado / fusionado' : 'Descartado', h.origenIds.join(', '), h.justificacion]), ['*', 90, 90, '*']),
      campo('Aprobación explícita', informe.evaluadores.filter(e => consenso.aprobadoPor.includes(e.id)).map(e => e.nombre).join(', ')),
    ],
    styles: { eyebrow: { fontSize: 9, bold: true, color: TEAL } },
  };
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
    return canvas.toDataURL('image/png');
  } finally { bitmap.close(); }
}

export async function exportarInformeFlujoPdf(proyectoId: string, evaluacion: EvaluacionFlujo): Promise<void> {
  const capturas = new Map<string, string | null>();
  const ids = [...new Set(evaluacion.informe?.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO').flatMap(h => h.evidenciaIds) ?? [])];
  for (const id of ids) {
    try { const { meta, blob } = await cargarEvidencia(proyectoId, evaluacion.id, id); capturas.set(id, await rasterizarEvidencia(blob, meta.anotaciones)); }
    catch { capturas.set(id, null); }
  }
  const { pdfMake, brand } = await cargarPdfMake();
  const nombre = evaluacion.informe?.configuracion.nombre ?? 'evaluacion';
  const slug = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  await pdfMake.createPdf(construirInformeFlujoPdf(evaluacion, capturas, new Date(), brand)).download(`heuristica-${slug}-v${evaluacion.informe?.version ?? 1}.pdf`);
}
