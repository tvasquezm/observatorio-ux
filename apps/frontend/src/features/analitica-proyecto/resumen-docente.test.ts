import { describe, expect, it } from 'vitest';
import type { EvaluacionFlujo } from '@observatorio-ux/shared-types';
import { alertasRevision, aporteIntegrantes, avanceTecnicas, comentariosSinRespuesta, hallazgosClave, novedadesDesde, type DatosDocente } from './resumen-docente';

const criterios = [{ id: 'c1', nombre: 'Visibilidad', categoria: 'Nielsen' }];
function evaluacion(parcial: Partial<Record<string, unknown>> = {}): EvaluacionFlujo {
  const configuracion = { nombre: 'Portal', producto: { nombre: 'Portal' }, metodologia: { criterios }, evaluadorIds: ['e1', 'e2'] };
  return {
    id: 'ev1', anteriorId: null, fase: 'FINALIZADA', configuracion, updatedAt: '2026-11-10T10:00:00Z', finalizadoEn: '2026-11-10T10:00:00Z',
    trabajos: [], avanceEquipo: [
      { evaluadorId: 'e1', nombre: 'Ana', guardadoEn: '2026-11-05T10:00:00Z', entregadoEn: '2026-11-06T10:00:00Z', evaluados: 1, total: 1 },
      { evaluadorId: 'e2', nombre: 'Beto', guardadoEn: null, entregadoEn: null, evaluados: 0, total: 1 },
    ],
    informe: { configuracion, consenso: { hallazgos: [
      { id: 'h1', titulo: 'No se puede guardar', severidad: 4, prioridad: 'URGENTE', criterioIds: ['c1'], decision: 'ACEPTADO', evidenciaIds: [], recomendacion: '' },
      { id: 'h2', titulo: 'Texto poco claro', severidad: 1, prioridad: 'BAJA', criterioIds: ['c1'], decision: 'ACEPTADO', evidenciaIds: ['x'], recomendacion: 'Aclarar' },
    ] } },
    ...parcial,
  } as unknown as EvaluacionFlujo;
}

function datos(parcial: Partial<DatosDocente> = {}): DatosDocente {
  return {
    personas: [{ contenido: { nombreCompleto: 'Camila', evidencia: [], estadoValidacion: 'PENDIENTE', frustraciones: ['Trámites lentos', 'trámites lentos', 'Clave'] } }],
    journeys: [{ contenido: { perfilUsuario: { nombre: 'Camila' }, fases: [{ nombre: 'Pago', emocion: 'Negativa', oportunidades: [] }] } }],
    momentos: [{ contenido: { perfilUsuario: { nombre: 'Camila' }, incidentes: [
      { nombre: 'Caída del portal', tipo: 'Negativo', impacto: 'Alto', frecuencia: 'Alta', accionesSugeridas: [] },
      { nombre: 'Aviso confuso', tipo: 'Negativo', impacto: 'Bajo', frecuencia: 'Baja', accionesSugeridas: ['Reescribir'] },
    ] } }],
    estudios: [{ id: 's1', nombre: 'Menú', evaluadorId: 'e2', createdAt: '2026-11-08T10:00:00Z', cerrado: false, respuestasCount: 4 }],
    evaluaciones: [evaluacion()],
    versiones: [
      { tipo: 'PERSONA', artefactoLogicoId: 'p1', version: 2, autorId: 'e1', autor: { id: 'e1', nombre: 'Ana' }, createdAt: '2026-11-12T10:00:00Z', contenido: { nombreCompleto: 'Camila' } },
      { tipo: 'PERSONA', artefactoLogicoId: 'p1', version: 1, autorId: 'e1', autor: { id: 'e1', nombre: 'Ana' }, createdAt: '2026-11-01T10:00:00Z', contenido: { nombreCompleto: 'Camila' } },
      { tipo: 'JOURNEY_MAP', artefactoLogicoId: 'j1', version: 1, autorId: 'e2', autor: { id: 'e2', nombre: 'Beto' }, createdAt: '2026-11-03T10:00:00Z', contenido: { perfilUsuario: { nombre: 'Camila' } } },
    ],
    miembros: [
      { usuarioId: 'e1', usuario: { nombre: 'Ana', rol: 'ESTUDIANTE' } }, { usuarioId: 'e2', usuario: { nombre: 'Beto', rol: 'ESTUDIANTE' } },
      { usuarioId: 'e3', usuario: { nombre: 'Carla', rol: 'ESTUDIANTE' } }, { usuarioId: 'doc', usuario: { nombre: 'Profesora', rol: 'DOCENTE' } },
    ],
    comentarios: [
      { id: 'k1', tecnica: 'personas', texto: 'Falta evidencia', autorId: 'doc', createdAt: '2026-11-09T10:00:00Z', autor: { nombre: 'Profesora' } },
      { id: 'k2', tecnica: 'journey-map', texto: 'Revisen la fase de pago', autorId: 'doc', createdAt: '2026-11-09T10:00:00Z', autor: { nombre: 'Profesora' } },
      { id: 'k3', tecnica: 'journey-map', texto: 'Listo, corregido', autorId: 'e2', createdAt: '2026-11-11T10:00:00Z', autor: { nombre: 'Beto' } },
    ],
    ...parcial,
  };
}

describe('resumen para el profesor', () => {
  it('semáforo de avance por técnica con la última actualización', () => {
    const avance = avanceTecnicas(datos());
    expect(avance.map(a => a.estado)).toEqual(['en-curso', 'en-curso', 'en-curso', 'en-curso', 'completa']);
    expect(avance[0]).toMatchObject({ detalle: '0 de 1 persona validada', ultima: '2026-11-12T10:00:00Z' });
    expect(avanceTecnicas(datos({ personas: [], estudios: [] })).map(a => a.estado)).toEqual(['sin-empezar', 'en-curso', 'en-curso', 'sin-empezar', 'completa']);
  });

  it('aporte de cada estudiante: versiones, estudios y revisiones; incluye a quien no aportó y deja fuera al docente', () => {
    const aporte = aporteIntegrantes(datos());
    expect(aporte.map(a => [a.nombre, a.total])).toEqual([['Ana', 3], ['Beto', 2], ['Carla', 0]]);
    expect(aporte[0].porTecnica).toMatchObject({ personas: 2, 'evaluacion-heuristica': 1 });
    expect(aporte[1].porTecnica).toMatchObject({ 'journey-map': 1, 'card-sorting': 1 });
  });

  it('alertas concretas con enlace a la técnica', () => {
    const textos = alertasRevision(datos()).map(a => `${a.ruta}: ${a.texto}`);
    for (const esperado of [
      'personas: 1 persona sin evidencia que la respalde: Camila.',
      'personas: 1 persona pendiente de validación.',
      'journey-map: 1 journey sin oportunidades de mejora: Camila.',
      'momentos-criticos: 1 incidente negativo sin acciones sugeridas.',
      'evaluacion-heuristica: En "Portal", 1 problema no tiene captura de evidencia.',
      'evaluacion-heuristica: En "Portal", 1 problema no tiene recomendación.',
      'miembros: 1 integrante sin aportes registrados: Carla.',
    ]) expect(textos).toContain(esperado);
    expect(textos.some(t => t.includes('un solo evaluador'))).toBe(false);
    const solo = alertasRevision(datos({ evaluaciones: [evaluacion({ configuracion: { nombre: 'Portal', producto: { nombre: 'Portal' }, metodologia: { criterios }, evaluadorIds: ['e1'] } })] }));
    expect(solo.some(a => a.texto.includes('un solo evaluador'))).toBe(true);
  });

  it('hallazgos clave: problema grave, momento más crítico, peor fase y frustración más repetida', () => {
    expect(hallazgosClave(datos()).map(h => `${h.tecnica}: ${h.texto}`)).toEqual([
      'Evaluación heurística: No se puede guardar (severidad 4, Portal)',
      'Momento más crítico: Caída del portal (impacto alto, frecuencia alta · Camila)',
      'Fase con peor experiencia: Pago',
      'Frustración principal: Trámites lentos (2)',
    ]);
  });

  it('novedades desde la última visita, sin lo que hizo el propio docente', () => {
    const textos = novedadesDesde(datos(), '2026-11-07T00:00:00Z', 'doc').map(n => n.texto);
    expect(textos).toEqual([
      'Ana editó personas · Camila',
      'Beto comentó en Journey Map: "Listo, corregido"',
      'Se finalizó la evaluación "Portal"',
      'Nuevo card sorting · Menú',
    ]);
  });

  it('comentarios del docente sin respuesta del equipo en la misma técnica', () => {
    expect(comentariosSinRespuesta(datos().comentarios, 'doc').map(c => c.id)).toEqual(['k1']);
  });
});
