import { describe, expect, it } from 'vitest';
import type { ConfiguracionFlujo, EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import { construirInformeFlujoPdf, dibujarAnotacion } from './informe-pdf';

const config: ConfiguracionFlujo = { nombre: 'Informe acordado', producto: { clave: 'portal', nombre: 'Portal', version: 'v1', url: 'https://ejemplo.cl', dispositivo: 'Web' }, objetivo: 'Matricular', tareas: 'Guardar formulario', pantallas: 'Inscripción', exclusiones: 'Pagos', metodologia: { ...METODOLOGIAS_HEURISTICAS[0], criterios: METODOLOGIAS_HEURISTICAS[0].criterios.slice(0, 1) }, evaluadorIds: ['u1'], lectorIds: [] };
const finding = { id: 'f1', criterioIds: [config.metodologia.criterios[0].id], titulo: 'Error acordado', pantalla: 'Inscripción', descripcion: 'No permite guardar.', recomendacion: 'Mostrar el error', severidad: 3 as const, prioridad: 'ALTA' as const, notas: '', evidenciaIds: ['cap1'], origenIds: ['origen1'], decision: 'ACEPTADO' as const, justificacion: 'Se verificó el error.' };
function evaluacion(): EvaluacionFlujo {
  const consenso = { criterios: [{ criterioId: config.metodologia.criterios[0].id, valor: config.metodologia.escala.niveles[0].id, noAplica: false, motivo: '', notas: '', justificacion: 'Revisión confirmada' }], hallazgos: [finding], aprobadoPor: ['u1'] };
  return { id: 'e1', proyectoId: 'p1', coordinadorId: 'u1', revision: 5, version: 1, anteriorId: null, fase: 'FINALIZADA', configuracion: { ...config, nombre: 'Configuración posterior' }, trabajos: [{ evaluadorId: 'u1', nombre: 'Ana', respuestas: [], hallazgos: [{ ...finding, titulo: 'Hallazgo sin consenso' }], guardadoEn: '2026-10-09', entregadoEn: '2026-10-09' }], consenso, informe: { version: 1, configuracion: config, consenso, evaluadores: [{ id: 'u1', nombre: 'Ana' }], iniciadoEn: '2026-10-09', consolidadoEn: '2026-10-09', finalizadoEn: '2026-10-09' }, comparacion: null, createdAt: '2026-10-09', updatedAt: '2026-10-09', iniciadoEn: '2026-10-09', consolidadoEn: '2026-10-09', finalizadoEn: '2026-10-09' };
}
describe('Informe consolidado PDF', () => {
  it('usa el snapshot del informe y cuenta únicamente problemas aceptados', () => {
    const ev = evaluacion();
    ev.informe!.consenso.hallazgos.push({ ...finding, id: 'descartado', titulo: 'Problema descartado', decision: 'DESCARTADO' });
    const pdf = construirInformeFlujoPdf(ev, new Map(), new Date('2026-10-09T12:00:00Z'));
    const contenido = JSON.stringify(pdf.content);
    expect(pdf.info?.title).toContain('Informe acordado');
    expect(contenido).not.toContain('Configuración posterior');
    expect(contenido).not.toContain('Hallazgo sin consenso');
    expect(contenido).toContain('Error acordado');
    expect(contenido).toContain('Decisiones de revisión');
    expect(contenido).not.toContain('Severidad promedio');
    expect(contenido).toContain('Portal');
    expect(contenido).toContain('Ana');
  });
  it('impide exportar resultados antes de consolidar', () => {
    const ev = evaluacion(); ev.fase = 'PENDIENTE_CONSENSO'; ev.informe = null;
    expect(() => construirInformeFlujoPdf(ev, new Map(), new Date())).toThrow(/consolida/i);
  });
  it('avisa cuando una evidencia no pudo incluirse y conserva la referencia', () => {
    const pdf = construirInformeFlujoPdf(evaluacion(), new Map([['cap1', null]]), new Date());
    expect(JSON.stringify(pdf.content)).toContain('Captura cap1 disponible en la aplicación');
  });
});
describe('Anotación de imágenes del informe', () => {
  it('traduce coordenadas normalizadas al tamaño de imagen, sin alterar el original', () => {
    const llamadas: unknown[][] = [];
    const ctx = { save() {}, restore() {}, strokeRect(...args: number[]) { llamadas.push(args); } } as unknown as CanvasRenderingContext2D;
    dibujarAnotacion(ctx, { id: 'a', tipo: 'rectangulo', x: 0.1, y: 0.2, x2: 0.5, y2: 0.6, color: '#ff0000', texto: '' }, 1000, 500);
    expect(llamadas[0]).toHaveLength(4);
    [100, 100, 400, 200].forEach((n, i) => expect(llamadas[0][i]).toBeCloseTo(n));
  });
});
