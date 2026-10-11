import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { METODOLOGIAS_HEURISTICAS } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, EvaluacionFlujo, HallazgoFlujo } from '@observatorio-ux/shared-types';
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
    metodologiaHeuristica: { create: jest.fn(), findMany: jest.fn(async () => []) },
    evidenciaHeuristicaCompleta: {
      count: jest.fn(async () => evidencias.size),
      findMany: jest.fn(async ({ where }: { where: { id: { in: string[] }; evaluacionId: string; autorId?: string } }) => [...evidencias.values()].filter(v => where.id.in.includes(v.id as string) && v.evaluacionId === where.evaluacionId && (!where.autorId || where.autorId === v.autorId))),
      findFirst: jest.fn(async ({ where }: { where: { id: string; evaluacionId: string } }) => { const ev = evidencias.get(where.id); return ev?.evaluacionId === where.evaluacionId ? ev : null; }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => { const ev = { id: randomUUID(), revision: 0, createdAt: new Date(), ...data }; evidencias.set(ev.id, ev); return ev; }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const ev = { ...evidencias.get(where.id), ...data, revision: (evidencias.get(where.id)!.revision as number) + 1 }; evidencias.set(where.id, ev); return ev; }),
    },
  };
  const acceso = { assertAccess: jest.fn(async () => {}) };
  return { service: new HeuristicaFlujoService(prisma as unknown as PrismaService, acceso as unknown as ProjectAccessService), prisma, filas, evidencias, acceso };
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

  it('rechaza entrega pendiente, NA sin motivo y valores no definidos; conserva borrador', async () => {
    const { service, filas } = preparar();
    let e = await service.crear('p', configuracion(), coordinador);
    e = await service.iniciar('p', e.id, { revision: e.revision }, coordinador);
    await expect(service.entregar('p', e.id, { revision: e.revision }, experto)).rejects.toBeInstanceOf(BadRequestException);
    const respuestas = e.configuracion.metodologia.criterios.map(c => ({ criterioId: c.id, valor: null, noAplica: true, motivo: '', notas: 'Borrador' }));
    e = await service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas, hallazgos: [] }, experto);
    await expect(service.entregar('p', e.id, { revision: e.revision }, experto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.guardarTrabajo('p', e.id, { revision: e.revision, respuestas: [{ ...respuestas[0], noAplica: false, valor: 'inventado' }], hallazgos: [] }, experto)).rejects.toBeInstanceOf(BadRequestException);
    expect((filas.get(e.id)!.trabajos as unknown as EvaluacionFlujo['trabajos'])[0].respuestas[0].notas).toBe('Borrador');
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
    await expect(service.subirEvidencia('p', e.id, { buffer: Buffer.alloc(2*1024*1024+1), size: 1 }, experto)).rejects.toBeInstanceOf(BadRequestException);
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
