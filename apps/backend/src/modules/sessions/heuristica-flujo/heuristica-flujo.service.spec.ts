import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EVIDENCIA_MAX_BYTES, METODOLOGIAS_HEURISTICAS, origenHallazgo, redactorDe, resumirCumplimiento, resumirEvaluacion } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, DecisionHallazgo, EvaluacionFlujo, HallazgoFlujo } from '@observatorio-ux/shared-types';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface.js';
import { Prisma, type EvaluacionHeuristicaCompleta } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../core/access/project-access.service.js';
import { HeuristicaFlujoService, filtrarEvaluacion } from './heuristica-flujo.service.js';

const usuario = (id: string, rol: AuthenticatedUser['rol'] = 'ESTUDIANTE'): AuthenticatedUser => ({ id, rol, actor: 'EVALUADOR' });
const coordinador = usuario('coordinador'), lector = usuario('lector'), experto = usuario('e1');
const configuracion = (cantidad = 1): ConfiguracionFlujo => ({ nombre: 'Web', producto: { clave: 'producto', nombre: 'Web', version: '1', url: 'https://example.com', dispositivo: 'PC' }, objetivo: 'Revisar usabilidad', tareas: 'Comprar', pantallas: 'Inicio y pago', exclusiones: '', metodologia: structuredClone(METODOLOGIAS_HEURISTICAS[0]), evaluadorIds: Array.from({ length: cantidad }, (_, i) => `e${i+1}`), lectorIds: [lector.id] });
const hallazgo = (id: string): HallazgoFlujo => ({ id, criterioIds: [METODOLOGIAS_HEURISTICAS[0].criterios[0].id], titulo: 'Problema', pantalla: 'Inicio', descripcion: 'Sin información de estado', recomendacion: 'Informar progreso', severidad: 2, prioridad: 'MEDIA', notas: '', evidenciaIds: [] });

// El doble serializa transacciones; la integración PostgreSQL comprueba el bloqueo real.
function preparar() {
  const filas = new Map<string, EvaluacionHeuristicaCompleta>();
  const evidencias = new Map<string, Record<string, unknown>>();
  const metodos = new Map<string, { id: string; autorId: string; contenido: unknown }>();
  let cola = Promise.resolve();
  const delegate = {
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const now = new Date();
      const fila = { id: randomUUID(), revision: 0, version: 1, anteriorId: null, fase: 'BORRADOR', informe: null, comparacion: null, iniciadoEn: null, consolidadoEn: null, finalizadoEn: null, createdAt: now, updatedAt: now, ...data } as unknown as EvaluacionHeuristicaCompleta;
      filas.set(fila.id, structuredClone(fila)); return structuredClone(fila);
    }),
    findFirst: jest.fn(async ({ where }: { where: { id: string; proyectoId: string } }) => {
      const fila = filas.get(where.id); return fila?.proyectoId === where.proyectoId ? structuredClone(fila) : null;
    }),
    findMany: jest.fn(async ({ where }: { where: { proyectoId: string } }) => [...filas.values()].filter(f => f.proyectoId === where.proyectoId).map(f => structuredClone(f))),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const fila = filas.get(where.id)!;
      for (const [key, value] of Object.entries(data)) {
        if (key === 'revision') fila.revision++;
        else (fila as unknown as Record<string, unknown>)[key] = value === Prisma.DbNull ? null : ['iniciadoEn','consolidadoEn','finalizadoEn'].includes(key) && value ? new Date(value as string) : value;
      }
      fila.updatedAt = new Date(); return structuredClone(fila);
    }),
  };
  const prisma = {
    evaluacionHeuristicaCompleta: delegate,
    $queryRaw: jest.fn(async () => []),
    $transaction: jest.fn(<T>(fn: (tx: unknown) => Promise<T>) => {
      const tarea = cola.then(() => fn(prisma)); cola = tarea.then(() => undefined, () => undefined); return tarea;
    }),
    proyecto: { findUniqueOrThrow: jest.fn(async () => ({ creadoPorId: coordinador.id, miembros: ['e1','e2','e3','e4','e5',lector.id].map(usuarioId => ({ usuarioId })), sala: null })) },
    usuario: { findMany: jest.fn(async () => [coordinador, experto, usuario('e2'), usuario('e3'), usuario('e4'), usuario('e5'), lector].map(u => ({ id: u.id, nombre: u.id, rol: u.rol }))), findUniqueOrThrow: jest.fn(async () => ({ nombre: 'Nombre servidor' })) },
    metodologiaHeuristica: {
      create: jest.fn(async ({ data }: { data: { id: string; autorId: string; contenido: unknown } }) => { metodos.set(data.id, structuredClone(data)); return data; }),
      findMany: jest.fn(async ({ where }: { where: { autorId: string } }) => [...metodos.values()].filter(m => m.autorId === where.autorId).map(m => structuredClone(m))),
      updateMany: jest.fn(async ({ where, data }: { where: { id: string; autorId: string }; data: { contenido: unknown } }) => { const m = metodos.get(where.id); if (!m || m.autorId !== where.autorId) return { count: 0 }; m.contenido = structuredClone(data.contenido); return { count: 1 }; }),
      deleteMany: jest.fn(async ({ where }: { where: { id: string; autorId: string } }) => { const m = metodos.get(where.id); if (!m || m.autorId !== where.autorId) return { count: 0 }; metodos.delete(where.id); return { count: 1 }; }),
    },
    evidenciaHeuristicaCompleta: {
      count: jest.fn(async () => evidencias.size),
      findMany: jest.fn(async ({ where }: { where: { id: { in: string[] }; evaluacionId: string; autorId?: string } }) => [...evidencias.values()].filter(v => where.id.in.includes(v.id as string) && v.evaluacionId === where.evaluacionId && (!where.autorId || where.autorId === v.autorId))),
      findFirst: jest.fn(async ({ where }: { where: { id: string; evaluacionId: string } }) => { const ev = evidencias.get(where.id); return ev?.evaluacionId === where.evaluacionId ? ev : null; }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { const ev = { id: randomUUID(), revision: 0, createdAt: new Date(), ...data }; evidencias.set(ev.id, ev); return ev; }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const ev = { ...evidencias.get(where.id), ...data, revision: (evidencias.get(where.id)!.revision as number) + 1 }; evidencias.set(where.id, ev); return ev; }),
    },
  };
  const acceso = { assertAccess: jest.fn(async () => {}) };
  return { service: new HeuristicaFlujoService(prisma as unknown as PrismaService, acceso as unknown as ProjectAccessService), prisma, filas, evidencias, metodos, acceso };
}

async function entregarTodos(service: HeuristicaFlujoService, cantidad = 1, conHallazgos = false) {
  let e = await service.crear('p', configuracion(cantidad), coordinador);
  e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
  for (const id of e.configuracion.evaluadorIds) {
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: null, noAplica: true, motivo: 'Fuera del contexto', notas: '' })), hallazgos: conHallazgos ? [hallazgo(`${id}-h`)] : [] }, usuario(id));
    e = await service.entregar('p', e.id, { revision: e.revision }, usuario(id));
  }
  return e;
}
function decisiones(e: EvaluacionFlujo) {
  return { revision: e.revision, criterios: e.trabajos[0].respuestas.map(r => ({ ...r, justificacion: 'Revisado y acordado explícitamente' })), hallazgos: e.trabajos.flatMap(t => t.hallazgos).map(h => ({ ...h, origenIds: [h.id], decision: 'ACEPTADO', justificacion: 'Confirmado en revisión' })) };
}

describe('Flujo heurístico: privacidad, transiciones y consenso', () => {
  const configuracionMinima = (cantidad = 1) => {
    const c = configuracion(cantidad);
    c.producto.version = ''; c.producto.dispositivo = ''; c.objetivo = ''; c.tareas = ''; c.pantallas = '';
    return c;
  };

  it.each([1, 5])('comienza con %i evaluadores en una sola escritura y sin alcance opcional', async cantidad => {
    const { service, prisma, filas } = preparar();
    const e = await service.comenzar('p', configuracionMinima(cantidad), coordinador);
    expect(e).toMatchObject({ fase: 'EN_EVALUACION', revision: 0, configuracion: configuracionMinima(cantidad) });
    expect(e.iniciadoEn).toBeTruthy();
    expect(e.avanceEquipo).toHaveLength(cantidad);
    expect(e.trabajos).toEqual([]);
    expect(filas.size).toBe(1);
    expect(prisma.evaluacionHeuristicaCompleta.create).toHaveBeenCalledTimes(1);
    expect(prisma.evaluacionHeuristicaCompleta.update).not.toHaveBeenCalled();
    const propia = await service.obtener('p', e.id, experto);
    expect(propia.trabajos).toEqual([{ evaluadorId: 'e1', nombre: 'e1', respuestas: [], hallazgos: [], entregadoEn: null, guardadoEn: null }]);
    await expect(service.obtener('p', e.id, lector)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el inicio antiguo también acepta los campos opcionales vacíos', async () => {
    const { service } = preparar();
    const e = await service.crear('p', configuracionMinima(), coordinador);
    expect((await service.iniciar('p', e.id, { revision: e.revision }, coordinador)).fase).toBe('EN_EVALUACION');
  });

  it.each([
    ['nombre', 'Escribe el nombre de la evaluación.'],
    ['producto.nombre', 'Escribe el nombre del producto.'],
    ['producto.clave', 'Escribe la clave del producto.'],
  ])('explica el campo obligatorio %s antes de guardar', async (campo, mensaje) => {
    const { service, filas, prisma } = preparar();
    const c = configuracionMinima();
    if (campo === 'nombre') c.nombre = ' ';
    else c.producto[campo === 'producto.nombre' ? 'nombre' : 'clave'] = ' ';
    await expect(service.comenzar('p', c, coordinador)).rejects.toThrow(mensaje);
    expect(filas.size).toBe(0);
    expect(prisma.evaluacionHeuristicaCompleta.create).not.toHaveBeenCalled();
  });

  it('no deja borrador si falla el inicio ni permite miembros o acceso ajenos', async () => {
    const { service, filas, prisma, acceso } = preparar();
    await expect(service.comenzar('p', { ...configuracionMinima(), evaluadorIds: ['intruso'] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.evaluacionHeuristicaCompleta.create).not.toHaveBeenCalled();
    acceso.assertAccess.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.comenzar('p', configuracionMinima(), coordinador)).rejects.toBeInstanceOf(ForbiddenException);
    prisma.evaluacionHeuristicaCompleta.create.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(service.comenzar('p', configuracionMinima(), coordinador)).rejects.toThrow('Sin conexión');
    expect(filas.size).toBe(0);
  });

  it('entrega y consolida un hallazgo sin pantalla, recomendación ni notas, con aprobación explícita', async () => {
    const { service } = preparar();
    let e = await service.crear('p', configuracion(), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    const respuestas = e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: 'cumple', noAplica: false, motivo: '', notas: '' }));
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas, hallazgos: [{ ...hallazgo('simple'), pantalla: '', recomendacion: '', notas: '' }] }, experto);
    e = await service.entregar('p', e.id, { revision: e.revision }, experto);
    e = await service.guardarConsenso('p', e.id, decisiones(e), coordinador);
    await expect(service.consolidar('p', e.id, { revision: e.revision }, coordinador)).rejects.toBeInstanceOf(ConflictException);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.informe!.consenso.hallazgos[0]).toMatchObject({ id: 'simple', pantalla: '', recomendacion: '', notas: '' });
  });

  it.each([
    [{ criterioIds: [] }, 'Selecciona un criterio para el hallazgo «Problema».'],
    [{ titulo: ' ' }, 'Escribe el título de cada hallazgo.'],
    [{ descripcion: ' ' }, 'Describe el hallazgo «Problema».'],
  ])('explica qué falta en el hallazgo: %j', async (cambios, mensaje) => {
    const { service } = preparar();
    let e = await service.crear('p', configuracion(), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    const respuestas = e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: null, noAplica: true, motivo: 'Fuera del contexto', notas: '' }));
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas, hallazgos: [{ ...hallazgo('h'), ...cambios }] }, experto);
    await expect(service.entregar('p', e.id, { revision: e.revision }, experto)).rejects.toThrow(mensaje);
  });

  it('identifica el criterio pendiente', async () => {
    const { service } = preparar();
    let e = await service.crear('p', configuracion(), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    const primero = e.configuracion.metodologia.criterios[0];
    await expect(service.entregar('p', e.id, { revision: e.revision }, experto)).rejects.toThrow(`Evalúa el criterio «${primero.nombre}».`);
  });

  it.each([1, 5])('finaliza %i evaluadores con todos los criterios No aplica sin motivo ni justificación adicional', async cantidad => {
    const { service } = preparar();
    const c = configuracion(cantidad);
    c.metodologia = structuredClone(METODOLOGIAS_HEURISTICAS.find(m => m.id === 'hassan-checklist-2003')!);
    let e = await service.comenzar('p', c, coordinador);
    const respuestas = c.metodologia.criterios.map(c => ({ criterioId: c.id, valor: null, noAplica: true, motivo: '', notas: '' }));
    for (const evaluadorId of c.evaluadorIds) {
      e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas, hallazgos: [] }, usuario(evaluadorId));
      expect(e.avanceEquipo!.find(t => t.evaluadorId === evaluadorId)!.evaluados).toBe(respuestas.length);
      e = await service.entregar('p', e.id, { revision: e.revision }, usuario(evaluadorId));
    }
    e = await service.guardarConsenso('p', e.id, { revision: e.revision, criterios: respuestas.map(r => ({ ...r, justificacion: '' })), hallazgos: [] }, coordinador);
    await expect(service.consolidar('p', e.id, { revision: e.revision }, coordinador)).rejects.toBeInstanceOf(ConflictException);
    for (const evaluadorId of c.evaluadorIds) e = await service.aprobar('p', e.id, { revision: e.revision }, usuario(evaluadorId));
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    e = await service.finalizar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.fase).toBe('FINALIZADA');
    expect(e.informe!.consenso.criterios.every(r => r.noAplica && r.motivo === '' && r.justificacion === '')).toBe(true);
    expect(resumirEvaluacion(c, e.informe!.consenso)).toMatchObject({ evaluados: 0, pendientes: 0, noAplica: respuestas.length, denominador: 0, indice: null });
    expect(resumirCumplimiento(c, e.informe!.consenso)!.total).toEqual({ favorables: 0, desfavorables: 0, neutros: 0, sinEvaluar: 0, noAplica: respuestas.length, proporcion: null });
  });

  it('mantiene la justificación del consenso para criterios valorados y rechaza No aplica con valor', async () => {
    const { service } = preparar();
    let e = await service.comenzar('p', configuracion(), coordinador);
    const respuestas = e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: 'cumple', noAplica: false, motivo: '', notas: '' }));
    await expect(service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [{ ...respuestas[0], noAplica: true }], hallazgos: [] }, experto)).rejects.toBeInstanceOf(BadRequestException);
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas, hallazgos: [] }, experto);
    e = await service.entregar('p', e.id, { revision: e.revision }, experto);
    await expect(service.guardarConsenso('p', e.id, { revision: e.revision, criterios: [{ ...respuestas[0], noAplica: true, justificacion: '' }], hallazgos: [] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    e = await service.guardarConsenso('p', e.id, { revision: e.revision, criterios: respuestas.map(r => ({ ...r, valor: 'no_cumple', justificacion: '' })), hallazgos: [] }, coordinador);
    await expect(service.aprobar('p', e.id, { revision: e.revision }, experto)).rejects.toThrow('Justifica cada decisión de criterio que difiere de alguna respuesta individual.');
  });

  it('excluye No aplica sin motivo del índice numérico y conserva como pendientes los NA con valor', () => {
    const c = configuracion();
    c.metodologia = { ...c.metodologia, protegida: false, criterios: c.metodologia.criterios.slice(0, 2), escala: { tipo: 'numerica', sentido: 'mayor_mejor', fuente: 'Prueba', formula: 'media_ponderada', niveles: [{ id: 'alto', etiqueta: 'Alto', significado: 'Cumple', valor: 4, favorable: true }] } };
    c.metodologia.criterios[0].peso = 2;
    c.metodologia.criterios[1].peso = 7;
    const criterios = c.metodologia.criterios.map(c => ({ criterioId: c.id, valor: null as string | null, noAplica: true, motivo: '', notas: '', justificacion: '' }));
    const consenso = { criterios, hallazgos: [], aprobadoPor: [] };
    expect(resumirEvaluacion(c, consenso)).toMatchObject({ evaluados: 0, pendientes: 0, noAplica: 2, indice: null, denominador: 0 });
    criterios[0] = { ...criterios[0], noAplica: false, valor: 'alto' };
    expect(resumirEvaluacion(c, consenso)).toMatchObject({ evaluados: 1, pendientes: 0, noAplica: 1, indice: 4, denominador: 2 });
    expect(resumirCumplimiento(c, consenso)!.total).toMatchObject({ favorables: 1, sinEvaluar: 0, noAplica: 1, proporcion: 1 });
    criterios[1].valor = 'alto';
    expect(resumirEvaluacion(c, consenso)).toMatchObject({ pendientes: 1, noAplica: 0, indice: 4, denominador: 2 });
    expect(resumirCumplimiento(c, consenso)!.total).toMatchObject({ sinEvaluar: 1, noAplica: 0 });
  });

  it.each([1,5])('cierra %i expertos NA solamente con aprobación explícita e informe independiente', async cantidad => {
    const { service, filas } = preparar();
    let e = await entregarTodos(service, cantidad);
    expect(e.fase).toBe('PENDIENTE_CONSENSO');
    await expect(service.consolidar('p', e.id, { revision: e.revision }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    e = await service.guardarConsenso('p', e.id, decisiones(e), coordinador);
    await expect(service.consolidar('p', e.id, { revision: e.revision }, coordinador)).rejects.toBeInstanceOf(ConflictException);
    for (const id of e.configuracion.evaluadorIds) e = await service.aprobar('p', e.id, { revision: e.revision }, usuario(id));
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    e = await service.finalizar('p', e.id, { revision: e.revision }, coordinador);
    const anterior = structuredClone(filas.get(e.id)!.informe);
    const version = await service.version('p', e.id, { revision: e.revision }, coordinador);
    expect(version).toMatchObject({ anteriorId: e.id, version: 2, fase: 'BORRADOR', trabajos: [], consenso: { aprobadoPor: [], criterios: [], hallazgos: [] } });
    expect(filas.get(e.id)!.informe).toEqual(anterior);
    await expect(service.guardarConsenso('p', e.id, { ...decisiones(e), revision: e.revision + 1 }, coordinador)).rejects.toBeInstanceOf(ConflictException);
  });

  it('oculta respuestas ajenas, lectores pendientes y ADMIN; filtra lista y proyecto URL', async () => {
    const { service, acceso } = preparar();
    let e = await service.crear('p', configuracion(5), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.trabajos).toEqual([]);
    expect(e.avanceEquipo).toHaveLength(5);
    expect(Object.keys(e.avanceEquipo![0]).sort()).toEqual(['entregadoEn','evaluados','evaluadorId','guardadoEn','nombre','total'].sort());
    expect((await service.obtener('p', e.id, experto)).trabajos.map(t => t.evaluadorId)).toEqual(['e1']);
    await expect(service.obtener('p', e.id, usuario('admin', 'ADMIN'))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.obtener('p', e.id, lector)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await service.listar('p', lector)).toEqual([]);
    await expect(service.obtener('otro-proyecto', e.id, coordinador)).rejects.toBeInstanceOf(NotFoundException);
    expect(acceso.assertAccess).toHaveBeenCalledWith('otro-proyecto', coordinador);
  });

  it('rechaza entrega pendiente y valores no definidos; conserva borrador', async () => {
    const { service, filas } = preparar();
    let e = await service.crear('p', configuracion(), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    await expect(service.entregar('p', e.id, { revision: e.revision }, experto)).rejects.toBeInstanceOf(BadRequestException);
    const respuestas = e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: null, noAplica: false, motivo: '', notas: 'Borrador' }));
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas, hallazgos: [] }, experto);
    await expect(service.entregar('p', e.id, { revision: e.revision }, experto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [{ ...respuestas[0], noAplica: false, valor: 'inventado' }], hallazgos: [] }, experto)).rejects.toBeInstanceOf(BadRequestException);
    expect((filas.get(e.id)!.trabajos as unknown as EvaluacionFlujo['trabajos'])[0].respuestas[0].notas).toBe('Borrador');
  });

  it('valida el valor contra la escala efectiva de cada criterio', async () => {
    const { service } = preparar();
    const config = configuracion();
    config.metodologia = { ...config.metodologia, id: 'propia', protegida: false };
    const [primero, segundo] = config.metodologia.criterios;
    primero.escala = { tipo: 'categorica', sentido: 'sin_orden', fuente: 'Checklist propio', niveles: [{ id: 'si', etiqueta: 'Sí', significado: 'Cumple' }, { id: 'no', etiqueta: 'No', significado: 'No cumple' }] };
    let e = await service.crear('p', config, coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    const r = (criterioId: string, valor: string) => ({ criterioId, valor, noAplica: false, motivo: '', notas: '' });
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [r(primero.id, 'si'), r(segundo.id, 'cumple')], hallazgos: [] }, experto);
    await expect(service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [r(primero.id, 'cumple')], hallazgos: [] }, experto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [r(segundo.id, 'si')], hallazgos: [] }, experto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('serializa guardados y rechaza revision obsoleta sin sobrescribir', async () => {
    const { service, prisma } = preparar();
    let e = await service.crear('p', configuracion(), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    const resultados = await Promise.allSettled(['uno','dos'].map(titulo => service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [], hallazgos: [{ ...hallazgo('h'), titulo }] }, experto)));
    expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((resultados.find(r => r.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
    expect((await service.obtener('p', e.id, experto)).trabajos[0].hallazgos[0].titulo).toBe('uno');
    expect(String(prisma.$queryRaw.mock.calls[0]?.[0])).toContain('FOR UPDATE');
  });

  it('exige cada origen una sola vez y revoca aprobaciones al editar consenso', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 5, true);
    const b = decisiones(e);
    e = await service.guardarConsenso('p', e.id, { ...b, hallazgos: b.hallazgos.slice(1) }, coordinador);
    await expect(service.aprobar('p', e.id, { revision: e.revision }, experto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.guardarConsenso('p', e.id, { ...b, revision: e.revision, hallazgos: [b.hallazgos[0], { ...b.hallazgos[0], id: 'duplicado' }] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    e = await service.guardarConsenso('p', e.id, { ...b, revision: e.revision }, coordinador);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    expect(e.consenso.aprobadoPor).toEqual([experto.id]);
    e = await service.guardarConsenso('p', e.id, { ...b, revision: e.revision }, usuario('e2'));
    expect(e.consenso.aprobadoPor).toEqual([]);
  });

  it('valida asignación, original inmutable y autoría de copia del servidor', async () => {
    const { service } = preparar();
    await expect(service.crear('p', { ...configuracion(), evaluadorIds: ['intruso'] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    const c = configuracion(); c.metodologia.criterios[0].peso = 2;
    await expect(service.crear('p', c, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    const propia = await service.guardarMetodologia('p', METODOLOGIAS_HEURISTICAS[0], coordinador);
    expect(propia.id).not.toBe(METODOLOGIAS_HEURISTICAS[0].id);
    expect(propia).toMatchObject({ autor: 'Nombre servidor', protegida: false });
    expect(propia.criterios[0].origen).toEqual(METODOLOGIAS_HEURISTICAS[0].criterios[0].origen);
  });
});

describe('Métodos propios del flujo', () => {
  const copia = () => ({ ...structuredClone(METODOLOGIAS_HEURISTICAS[0]), protegida: false });
  const sinGuardar = (propia: Awaited<ReturnType<HeuristicaFlujoService['guardarMetodologia']>>) => structuredClone(propia);

  it('el autor edita su método: conserva id, fija autor y protegida desde el servidor', async () => {
    const { service, metodos } = preparar();
    const propia = await service.guardarMetodologia('p', copia(), coordinador);
    const editada = await service.actualizarMetodologia('p', propia.id, { ...propia, id: 'otro', protegida: true, autor: 'Falso', nombre: 'Renombrada', criterios: propia.criterios.slice(0, 2) }, coordinador);
    expect(editada).toMatchObject({ id: propia.id, nombre: 'Renombrada', autor: 'Nombre servidor', protegida: false });
    expect(editada.criterios).toHaveLength(2);
    expect(metodos.size).toBe(1);
    const lista = await service.metodologias('p', coordinador);
    expect(lista.filter(m => (m as { id: string }).id === propia.id)).toEqual([editada]);
  });
  it('otra persona recibe 404 al editar o borrar y el método no cambia', async () => {
    const { service, metodos } = preparar();
    const propia = await service.guardarMetodologia('p', copia(), coordinador);
    const antes = structuredClone([...metodos.values()]);
    await expect(service.actualizarMetodologia('p', propia.id, { ...propia, nombre: 'Robado' }, experto)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.borrarMetodologia('p', propia.id, experto)).rejects.toBeInstanceOf(NotFoundException);
    expect([...metodos.values()]).toEqual(antes);
  });
  it('un método inexistente o del catálogo responde igual que uno ajeno', async () => {
    const { service } = preparar();
    await expect(service.actualizarMetodologia('p', randomUUID(), copia(), coordinador)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.actualizarMetodologia('p', METODOLOGIAS_HEURISTICAS[0].id, copia(), coordinador)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.borrarMetodologia('p', METODOLOGIAS_HEURISTICAS[0].id, coordinador)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('rechaza un cuerpo inválido sin tocar lo guardado y exige acceso al proyecto', async () => {
    const { service, metodos, acceso } = preparar();
    const propia = await service.guardarMetodologia('p', copia(), coordinador);
    const antes = structuredClone([...metodos.values()]);
    await expect(service.actualizarMetodologia('p', propia.id, { ...sinGuardar(propia), criterios: [] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.actualizarMetodologia('p', propia.id, { ...sinGuardar(propia), extra: true }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    expect([...metodos.values()]).toEqual(antes);
    acceso.assertAccess.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.borrarMetodologia('ajeno', propia.id, coordinador)).rejects.toBeInstanceOf(ForbiddenException);
    expect(metodos.size).toBe(1);
  });
  it('borra solo una vez y no altera una evaluación que ya usa una copia', async () => {
    const { service } = preparar();
    const propia = await service.guardarMetodologia('p', copia(), coordinador);
    const e = await service.crear('p', { ...configuracion(), metodologia: propia }, coordinador);
    await service.borrarMetodologia('p', propia.id, coordinador);
    await expect(service.borrarMetodologia('p', propia.id, coordinador)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.metodologias('p', coordinador)).some(m => (m as { id: string }).id === propia.id)).toBe(false);
    const leida = await service.obtener('p', e.id, coordinador);
    expect(leida.configuracion.metodologia).toEqual(propia);
  });
});

describe('Evidencias del flujo', () => {
  const PNG = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
  it('aísla blob/meta, rechaza referencias ajenas y conserva bytes al anotar', async () => {
    const { service, evidencias } = preparar();
    let e = await service.crear('p', configuracion(5), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    const captura = await service.subirEvidencia('p', e.id, { buffer: PNG, size: PNG.length }, experto);
    for (const user of [coordinador, usuario('e2'), usuario('admin','ADMIN'), lector]) {
      await expect(service.obtenerEvidencia('p', e.id, captura.id, user)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.obtenerEvidencia('p', e.id, captura.id, user, true)).rejects.toBeInstanceOf(ForbiddenException);
    }
    await expect(service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [], hallazgos: [{ ...hallazgo('h'), evidenciaIds: [captura.id] }] }, usuario('e2'))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.obtenerEvidencia('p', e.id, randomUUID(), experto)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.obtenerEvidencia('otro-proyecto', e.id, captura.id, experto)).rejects.toBeInstanceOf(NotFoundException);
    const anotaciones = [{ id: 'a', tipo: 'rectangulo', x: 0, y: 0, x2: 1, y2: 1, color: '#ff0000', texto: '' }];
    await service.anotarEvidencia('p', e.id, captura.id, { revision: captura.revision, anotaciones }, experto);
    await expect(service.anotarEvidencia('p', e.id, captura.id, { revision: captura.revision, anotaciones: [] }, experto)).rejects.toBeInstanceOf(ConflictException);
    expect(Buffer.from(evidencias.get(captura.id)!.datos as Uint8Array)).toEqual(PNG);
    expect(await service.obtenerEvidencia('p', e.id, captura.id, experto, true)).toMatchObject({ anotaciones });
  });
  it('valida formato, tamaño, límite y la prohibición de editar una entrega', async () => {
    const { service, prisma } = preparar();
    let e = await service.crear('p', configuracion(), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    await expect(service.subirEvidencia('p', e.id, { buffer: Buffer.from('<svg/>'), size: 6 }, experto)).rejects.toThrow();
    await expect(service.subirEvidencia('p', e.id, { buffer: Buffer.alloc(EVIDENCIA_MAX_BYTES+1), size: 1 }, experto)).rejects.toBeInstanceOf(BadRequestException);
    prisma.evidenciaHeuristicaCompleta.count.mockResolvedValue(50);
    await expect(service.subirEvidencia('p', e.id, { buffer: PNG, size: PNG.length }, experto)).rejects.toBeInstanceOf(ConflictException);
  });
  it('lectores solo reciben hallazgos aceptados y nunca originales descartados', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 1, true);
    const b = decisiones(e); b.hallazgos[0].decision = 'DESCARTADO';
    e = await service.guardarConsenso('p', e.id, b, coordinador);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    const publico = filtrarEvaluacion(e, lector);
    expect(publico.trabajos).toEqual([]); expect(publico.consenso.hallazgos).toEqual([]); expect(publico.informe!.consenso.hallazgos).toEqual([]);
    expect(e.consenso.hallazgos).toHaveLength(1);
    await expect(service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [], hallazgos: [] }, experto)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Comparaciones manuales y snapshots', () => {
  async function finalizar(service: HeuristicaFlujoService) {
    let e = await entregarTodos(service, 1, true);
    e = await service.guardarConsenso('p', e.id, decisiones(e), coordinador);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    return service.finalizar('p', e.id, { revision: e.revision }, coordinador);
  }
  it('no infiere solución por ausencia; exige justificación e IDs válidos, sin alterar informe', async () => {
    const { service, filas } = preparar();
    const anterior = await finalizar(service), actual = await finalizar(service);
    const snapshot = structuredClone(actual.informe);
    expect(await service.comparacion('p', actual.id, anterior.id, lector)).toMatchObject({ compatible: true, vinculos: [], confirmadoPor: null });
    const vinculo = { anteriorId: anterior.consenso.hallazgos[0].id, actualId: null, estado: 'SOLUCIONADO', justificacion: '' };
    await expect(service.guardarComparacion('p', actual.id, { revision: actual.revision, previaId: anterior.id, vinculos: [vinculo] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.guardarComparacion('p', actual.id, { revision: actual.revision, previaId: anterior.id, vinculos: [{ ...vinculo, anteriorId: 'inventado', justificacion: 'Comprobado' }] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    const guardada = await service.guardarComparacion('p', actual.id, { revision: actual.revision, previaId: anterior.id, vinculos: [{ ...vinculo, justificacion: 'Se comprobó la nueva versión reproduciendo la tarea.' }] }, coordinador);
    expect(guardada.comparacion?.confirmadoPor).toBe(coordinador.id);
    expect(filas.get(actual.id)!.informe).toEqual(snapshot);
    await expect(service.guardarComparacion('p', actual.id, { revision: guardada.revision, previaId: anterior.id, vinculos: [] }, lector)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.comparacion('otro', actual.id, anterior.id, coordinador)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('bloquea estados de resultado en alcance incompatible y autoriza ambas evaluaciones', async () => {
    const { service, filas } = preparar();
    const anterior = await finalizar(service), actual = await finalizar(service);
    const configActual = filas.get(actual.id)!.configuracion as unknown as ConfiguracionFlujo;
    configActual.tareas = 'Otro recorrido';
    const vinculo = { anteriorId: anterior.consenso.hallazgos[0].id, actualId: actual.consenso.hallazgos[0].id, estado: 'PERMANECE', justificacion: 'Revisado' };
    expect((await service.comparacion('p', actual.id, anterior.id, lector)).compatible).toBe(false);
    await expect(service.guardarComparacion('p', actual.id, { revision: actual.revision, previaId: anterior.id, vinculos: [vinculo] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    const r = await service.guardarComparacion('p', actual.id, { revision: actual.revision, previaId: anterior.id, vinculos: [{ ...vinculo, estado: 'NO_COMPARABLE' }] }, coordinador);
    expect(r.comparacion!.compatible).toBe(false);
    (filas.get(anterior.id)!.configuracion as unknown as ConfiguracionFlujo).lectorIds = [];
    await expect(service.comparacion('p', actual.id, anterior.id, lector)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Consenso: aspectos positivos y conclusión', () => {
  const positivos = [{ id: 'pos1', titulo: 'Navegación clara', descripcion: 'Las etiquetas del menú se entienden.' }];
  it('conserva positivos y conclusión hasta el informe consolidado', async () => {
    const { service, filas } = preparar();
    let e = await entregarTodos(service, 1);
    e = await service.guardarConsenso('p', e.id, { ...decisiones(e), positivos, conclusion: 'Recomendamos corregir el formulario.' }, coordinador);
    expect(filas.get(e.id)!.consenso).toMatchObject({ positivos, conclusion: 'Recomendamos corregir el formulario.' });
    for (const id of e.configuracion.evaluadorIds) e = await service.aprobar('p', e.id, { revision: e.revision }, usuario(id));
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.informe!.consenso.positivos).toEqual(positivos);
    expect(e.informe!.consenso.conclusion).toBe('Recomendamos corregir el formulario.');
  });
  it('un consenso antiguo sin los campos nuevos sigue siendo válido hasta consolidar', async () => {
    const { service, filas } = preparar();
    let e = await entregarTodos(service, 1);
    e = await service.guardarConsenso('p', e.id, decisiones(e), coordinador);
    expect(e.consenso).toMatchObject({ positivos: [], conclusion: '', mejoras: [] });
    const guardado = filas.get(e.id)!.consenso as Record<string, unknown>;
    delete guardado.positivos; delete guardado.conclusion; delete guardado.mejoras;
    for (const id of e.configuracion.evaluadorIds) e = await service.aprobar('p', e.id, { revision: e.revision }, usuario(id));
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.fase).toBe('CONSOLIDADA');
    expect(e.informe!.consenso.positivos ?? []).toEqual([]);
  });
  it('no permite confirmar un positivo sin título', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 1);
    e = await service.guardarConsenso('p', e.id, { ...decisiones(e), positivos: [{ id: 'pos1', titulo: '  ', descripcion: 'Sin título' }] }, coordinador);
    await expect(service.aprobar('p', e.id, { revision: e.revision }, usuario(e.configuracion.evaluadorIds[0]))).rejects.toThrow('Completa el título de cada aspecto positivo.');
  });
});

describe('Consenso: mejoras antes/después con capturas', () => {
  const PNG = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
  const subir = (service: HeuristicaFlujoService, id: string, user: AuthenticatedUser) => service.subirEvidencia('p', id, { buffer: PNG, size: PNG.length }, user);
  const mejora = (antesIds: string[], despuesIds: string[], titulo = 'Formulario de inscripción') => ({ id: 'm1', titulo, descripcion: 'Se agregó el mensaje de error.', antesIds, despuesIds });
  it('coordinador y experto adjuntan en consenso; el lector solo ve las capturas del informe', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 1);
    const antes = await subir(service, e.id, coordinador);
    const despues = await subir(service, e.id, experto);
    const suelta = await subir(service, e.id, experto);
    e = await service.guardarConsenso('p', e.id, { ...decisiones(e), mejoras: [mejora([antes.id], [despues.id])] }, coordinador);
    expect(e.consenso.mejoras).toHaveLength(1);
    await expect(service.obtenerEvidencia('p', e.id, antes.id, lector)).rejects.toBeInstanceOf(ForbiddenException);
    for (const id of e.configuracion.evaluadorIds) e = await service.aprobar('p', e.id, { revision: e.revision }, usuario(id));
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.informe!.consenso.mejoras).toEqual([mejora([antes.id], [despues.id])]);
    await expect(service.obtenerEvidencia('p', e.id, antes.id, lector)).resolves.toMatchObject({ mimeType: 'image/png' });
    await expect(service.obtenerEvidencia('p', e.id, despues.id, lector)).resolves.toMatchObject({ mimeType: 'image/png' });
    await expect(service.obtenerEvidencia('p', e.id, suelta.id, lector)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(subir(service, e.id, coordinador)).rejects.toBeInstanceOf(ConflictException);
  });
  it('no deja adjuntar en consenso a un lector ni a un ajeno', async () => {
    const { service } = preparar();
    const e = await entregarTodos(service, 1);
    for (const user of [lector, usuario('admin', 'ADMIN')]) await expect(subir(service, e.id, user)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rechaza capturas de otra evaluación o inexistentes y exige título al confirmar', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 1);
    const otra = await entregarTodos(service, 1);
    const ajena = await subir(service, otra.id, experto);
    for (const id of [ajena.id, randomUUID()]) await expect(service.guardarConsenso('p', e.id, { ...decisiones(e), mejoras: [mejora([id], [])] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    const propia = await subir(service, e.id, experto);
    e = await service.guardarConsenso('p', e.id, { ...decisiones(e), mejoras: [mejora([propia.id], [], '  ')] }, coordinador);
    await expect(service.aprobar('p', e.id, { revision: e.revision }, experto)).rejects.toThrow('Completa el título de cada mejora.');
  });
});

describe('Consenso: acuerdo sobre la tabla y hallazgos nuevos del equipo', () => {
  async function entregaUnica(hallazgos: HallazgoFlujo[] = []) {
    const { service } = preparar();
    let e = await service.comenzar('p', configuracion(), coordinador);
    const respuestas = e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: 'cumple', noAplica: false, motivo: '', notas: '' }));
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas, hallazgos }, experto);
    e = await service.entregar('p', e.id, { revision: e.revision }, experto);
    return { service, e, respuestas };
  }
  const nuevo = (id: string, extra: Partial<DecisionHallazgo> = {}): DecisionHallazgo => ({ ...hallazgo(id), origenIds: [], decision: 'ACEPTADO', justificacion: 'Lo vio el equipo al comparar', ...extra });

  it('criterio con respuestas coincidentes consolida sin justificación', async () => {
    const { service, e: previa, respuestas } = await entregaUnica();
    let e = await service.guardarConsenso('p', previa.id, { revision: previa.revision, criterios: respuestas.map(r => ({ ...r, justificacion: '' })), hallazgos: [] }, coordinador);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.fase).toBe('CONSOLIDADA');
  });

  it('criterio que difiere sin justificación se rechaza y con justificación se acepta', async () => {
    const { service, e: previa, respuestas } = await entregaUnica();
    let e = await service.guardarConsenso('p', previa.id, { revision: previa.revision, criterios: respuestas.map(r => ({ ...r, valor: 'no_cumple', justificacion: '' })), hallazgos: [] }, coordinador);
    await expect(service.aprobar('p', e.id, { revision: e.revision }, experto)).rejects.toBeInstanceOf(BadRequestException);
    e = await service.guardarConsenso('p', e.id, { revision: e.revision, criterios: respuestas.map(r => ({ ...r, valor: 'no_cumple', justificacion: 'El equipo vio incumplimiento' })), hallazgos: [] }, coordinador);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    expect(e.consenso.aprobadoPor).toEqual([experto.id]);
  });

  it('No aplica sin justificación mantiene la regla actual aunque difiera de lo individual', async () => {
    const { service, e: previa, respuestas } = await entregaUnica();
    let e = await service.guardarConsenso('p', previa.id, { revision: previa.revision, criterios: respuestas.map(r => ({ ...r, valor: null, noAplica: true, justificacion: '' })), hallazgos: [] }, coordinador);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    expect(e.consenso.aprobadoPor).toEqual([experto.id]);
  });

  it('hallazgo nuevo válido del equipo se acepta, llega al informe y su origen se deriva del servidor', async () => {
    const { service, e: previa, respuestas } = await entregaUnica();
    let e = await service.guardarConsenso('p', previa.id, { revision: previa.revision, criterios: respuestas.map(r => ({ ...r, justificacion: '' })), hallazgos: [nuevo('nuevo-1')] }, coordinador);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    expect(e.informe!.consenso.hallazgos.map(h => [h.id, origenHallazgo(h)])).toEqual([['nuevo-1', 'equipo']]);
  });

  it.each([
    ['sin justificación', { justificacion: '  ' }],
    ['pendiente', { decision: 'PENDIENTE' as const }],
    ['sin descripción', { descripcion: ' ', decision: 'DESCARTADO' as const }],
    ['sin título', { titulo: ' ', decision: 'DESCARTADO' as const }],
  ])('hallazgo nuevo %s se guarda como borrador pero no se confirma', async (_, extra) => {
    const { service, e: previa, respuestas } = await entregaUnica();
    const e = await service.guardarConsenso('p', previa.id, { revision: previa.revision, criterios: respuestas.map(r => ({ ...r, justificacion: '' })), hallazgos: [nuevo('nuevo-1', extra)] }, coordinador);
    await expect(service.aprobar('p', e.id, { revision: e.revision }, experto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hallazgo original sin resolver sigue rechazando la confirmación aunque haya uno nuevo válido', async () => {
    const { service, e: previa, respuestas } = await entregaUnica([hallazgo('original-1')]);
    const e = await service.guardarConsenso('p', previa.id, { revision: previa.revision, criterios: respuestas.map(r => ({ ...r, justificacion: '' })), hallazgos: [nuevo('nuevo-1')] }, coordinador);
    await expect(service.aprobar('p', e.id, { revision: e.revision }, experto)).rejects.toThrow('Resuelve todos los hallazgos originales');
  });

  it('rechaza un origen inexistente y respeta el tope de hallazgos nuevos', async () => {
    const { service, e, respuestas } = await entregaUnica();
    const base = { revision: e.revision, criterios: respuestas.map(r => ({ ...r, justificacion: '' })) };
    await expect(service.guardarConsenso('p', e.id, { ...base, hallazgos: [nuevo('x', { origenIds: ['inventado'] })] }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    const lote = (n: number) => Array.from({ length: n }, (_, i) => nuevo(`nuevo-${i}`));
    await expect(service.guardarConsenso('p', e.id, { ...base, hallazgos: lote(51) }, coordinador)).rejects.toBeInstanceOf(BadRequestException);
    const guardado = await service.guardarConsenso('p', e.id, { ...base, hallazgos: lote(50) }, coordinador);
    expect(guardado.consenso.hallazgos).toHaveLength(50);
  });

  it('solo participantes editan el consenso y uno consolidado no se modifica', async () => {
    const { service, e: previa, respuestas } = await entregaUnica();
    const body = (revision: number) => ({ revision, criterios: respuestas.map(r => ({ ...r, justificacion: '' })), hallazgos: [nuevo('nuevo-1')] });
    await expect(service.guardarConsenso('p', previa.id, body(previa.revision), lector)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.guardarConsenso('p', previa.id, body(previa.revision), usuario('ajeno'))).rejects.toBeInstanceOf(ForbiddenException);
    let e = await service.guardarConsenso('p', previa.id, body(previa.revision), experto);
    e = await service.aprobar('p', e.id, { revision: e.revision }, experto);
    e = await service.consolidar('p', e.id, { revision: e.revision }, coordinador);
    await expect(service.guardarConsenso('p', e.id, body(e.revision), coordinador)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('Consenso: votación del redactor', () => {
  const votar = (service: HeuristicaFlujoService, e: EvaluacionFlujo, quien: string, candidatoId: string) => service.votarRedactor('p', e.id, { revision: e.revision, candidatoId }, usuario(quien));

  it('sin votos no hay redactor elegido (el coordinador es el redactor por defecto)', async () => {
    const { service } = preparar();
    const e = await entregarTodos(service, 3);
    expect(e.consenso.redactorId).toBeUndefined();
    expect(redactorDe(e.consenso, e.coordinadorId)).toBe(coordinador.id);
  });

  it('mayoría simple de 3 expertos elige redactor y conserva los votos', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 3);
    e = await votar(service, e, 'e1', 'e2');
    expect(e.consenso.redactorId).toBeUndefined();
    e = await votar(service, e, 'e3', 'e2');
    expect(e.consenso).toMatchObject({ redactorId: 'e2', votosRedactor: { e1: 'e2', e3: 'e2' } });
  });

  it('empate o voto faltante sin mayoría: solo el coordinador decide', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 2);
    e = await votar(service, e, 'e1', 'e1');
    e = await votar(service, e, 'e2', 'e2');
    expect(e.consenso.redactorId).toBeUndefined();
    await expect(service.decidirRedactor('p', e.id, { revision: e.revision, redactorId: 'e1' }, experto)).rejects.toBeInstanceOf(ForbiddenException);
    e = await service.decidirRedactor('p', e.id, { revision: e.revision, redactorId: 'e1' }, coordinador);
    expect(e.consenso.redactorId).toBe('e1');
  });

  it('el coordinador no puede imponer redactor si el equipo ya eligió por mayoría', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 3);
    e = await votar(service, e, 'e1', 'e3');
    e = await votar(service, e, 'e2', 'e3');
    await expect(service.decidirRedactor('p', e.id, { revision: e.revision, redactorId: 'e1' }, coordinador)).rejects.toBeInstanceOf(ConflictException);
  });

  it('valida candidato, votante y fase', async () => {
    const { service } = preparar();
    const previa = await service.crear('p', configuracion(3), coordinador);
    await expect(service.votarRedactor('p', previa.id, { revision: previa.revision, candidatoId: 'e1' }, experto)).rejects.toBeInstanceOf(ConflictException);
    const e = await entregarTodos(service, 3);
    await expect(votar(service, e, 'e1', 'inventado')).rejects.toBeInstanceOf(BadRequestException);
    await expect(votar(service, e, lector.id, 'e1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(votar(service, e, coordinador.id, 'e1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.votarRedactor('p', e.id, { revision: e.revision + 1, candidatoId: 'e1' }, experto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('guardar el acuerdo no borra redactor ni votos', async () => {
    const { service } = preparar();
    let e = await entregarTodos(service, 3);
    e = await votar(service, e, 'e1', 'e2');
    e = await votar(service, e, 'e3', 'e2');
    e = await service.guardarConsenso('p', e.id, decisiones(e), coordinador);
    expect(e.consenso).toMatchObject({ redactorId: 'e2', votosRedactor: { e1: 'e2', e3: 'e2' } });
  });
});
