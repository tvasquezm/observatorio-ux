import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { METODOLOGIAS_HEURISTICAS, comprobarCompatibilidad, EVIDENCIA_MAX_BYTES } from '@observatorio-ux/shared-types';
import type { ConfiguracionFlujo, ConsensoFlujo, EvaluacionFlujo, EvidenciaFlujo, HallazgoFlujo, InformeFlujo, RespuestaCriterio, TrabajoFlujo } from '@observatorio-ux/shared-types';
import { Prisma, type EvaluacionHeuristicaCompleta, type EvidenciaHeuristicaCompleta } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../core/access/project-access.service.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface.js';
import type { ArchivoSubido } from '../evaluacion-heuristica/heuristica-evidencia.service.js';
import { detectarMimeImagen } from '../evaluacion-heuristica/evidencia.util.js';
import { anotacionesSchema, comparacionSchema, configuracionBodySchema, configuracionSchema, consensoSchema, metodologiaSchema, revisionSchema, trabajoSchema, validar } from './heuristica-flujo.schemas.js';

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const consensoVacio = (): ConsensoFlujo => ({ criterios: [], hallazgos: [], aprobadoPor: [] });
const fecha = (v: Date | null) => v?.toISOString() ?? null;
function leer(fila: EvaluacionHeuristicaCompleta): EvaluacionFlujo {
  return { ...fila, fase: fila.fase as EvaluacionFlujo['fase'], configuracion: fila.configuracion as unknown as ConfiguracionFlujo,
    trabajos: fila.trabajos as unknown as TrabajoFlujo[], consenso: fila.consenso as unknown as ConsensoFlujo,
    informe: fila.informe as unknown as InformeFlujo | null, comparacion: fila.comparacion as unknown as EvaluacionFlujo['comparacion'],
    createdAt: fila.createdAt.toISOString(), updatedAt: fila.updatedAt.toISOString(), iniciadoEn: fecha(fila.iniciadoEn), consolidadoEn: fecha(fila.consolidadoEn), finalizadoEn: fecha(fila.finalizadoEn) };
}
function permitido(e: EvaluacionFlujo, user: AuthenticatedUser) {
  return e.coordinadorId === user.id || e.configuracion.evaluadorIds.includes(user.id) ||
    (['CONSOLIDADA', 'FINALIZADA'].includes(e.fase) && e.configuracion.lectorIds.includes(user.id));
}
export function filtrarEvaluacion(e: EvaluacionFlujo, user: AuthenticatedUser): EvaluacionFlujo {
  if (!permitido(e, user)) throw new ForbiddenException('No tienes acceso al flujo de esta evaluación.');
  const copia = structuredClone(e);
  const participante = e.coordinadorId === user.id || e.configuracion.evaluadorIds.includes(user.id);
  if (participante) copia.avanceEquipo = e.trabajos.map(t => ({ evaluadorId: t.evaluadorId, nombre: t.nombre, entregadoEn: t.entregadoEn, guardadoEn: t.guardadoEn,
    evaluados: t.respuestas.filter(r => r.noAplica ? !!r.motivo.trim() : r.valor !== null).length, total: e.configuracion.metodologia.criterios.length }));
  if (!participante) {
    delete copia.avanceEquipo;
    copia.trabajos = [];
    copia.consenso = { ...copia.consenso, hallazgos: copia.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO') };
    if (copia.informe) copia.informe.consenso.hallazgos = copia.informe.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO');
  } else if (['BORRADOR', 'EN_EVALUACION'].includes(e.fase)) {
    copia.trabajos = copia.trabajos.filter(t => t.evaluadorId === user.id);
  }
  return copia;
}

@Injectable()
export class HeuristicaFlujoService {
  constructor(private readonly prisma: PrismaService, private readonly projectAccess: ProjectAccessService) {}

  async equipo(proyectoId: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    const proyecto = await this.prisma.proyecto.findUniqueOrThrow({ where: { id: proyectoId }, select: { creadoPorId: true, miembros: { select: { usuarioId: true } }, sala: { select: { profesorId: true } } } });
    const ids = [...new Set([proyecto.creadoPorId, ...proyecto.miembros.map(m => m.usuarioId), ...(proyecto.sala ? [proyecto.sala.profesorId] : []), user.id])];
    return this.prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, rol: true }, orderBy: { nombre: 'asc' } });
  }

  async metodologias(proyectoId: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    const propias = await this.prisma.metodologiaHeuristica.findMany({ where: { autorId: user.id }, orderBy: { createdAt: 'desc' } });
    return [...structuredClone(METODOLOGIAS_HEURISTICAS), ...propias.map(m => m.contenido)];
  }

  async guardarMetodologia(proyectoId: string, body: unknown, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    const contenido = validar(metodologiaSchema, body);
    const autor = await this.prisma.usuario.findUniqueOrThrow({ where: { id: user.id }, select: { nombre: true } });
    const nueva = { ...contenido, id: randomUUID(), autor: autor.nombre, protegida: false };
    await this.prisma.metodologiaHeuristica.create({ data: { id: nueva.id, autorId: user.id, contenido: json(nueva) } });
    return nueva;
  }

  private async validarConfiguracion(proyectoId: string, c: ConfiguracionFlujo, user: AuthenticatedUser, completa = false) {
    const miembros = await this.equipo(proyectoId, user);
    if ([...c.evaluadorIds, ...c.lectorIds].some(id => !miembros.some(m => m.id === id))) throw new BadRequestException('Expertos y lectores deben pertenecer al equipo del proyecto.');
    if (c.metodologia.protegida) {
      const original = METODOLOGIAS_HEURISTICAS.find(m => m.id === c.metodologia.id);
      if (!original || !isDeepStrictEqual(json(original), json(c.metodologia))) throw new BadRequestException('El catálogo original es inmutable; crea una copia para personalizarlo.');
    }
    if (completa && [c.nombre, c.producto.clave, c.producto.nombre, c.producto.version, c.producto.dispositivo, c.objetivo, c.tareas, c.pantallas].some(v => !v.trim())) throw new BadRequestException('Completa producto, objetivo, tareas y pantallas antes de iniciar.');
  }

  async crear(proyectoId: string, body: unknown, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    const configuracion = validar(configuracionSchema, body);
    await this.validarConfiguracion(proyectoId, configuracion, user);
    const creada = await this.prisma.evaluacionHeuristicaCompleta.create({ data: { proyectoId, coordinadorId: user.id, configuracion: json(configuracion), trabajos: [], consenso: json(consensoVacio()) } });
    return filtrarEvaluacion(leer(creada), user);
  }

  async listar(proyectoId: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    const filas = await this.prisma.evaluacionHeuristicaCompleta.findMany({ where: { proyectoId }, orderBy: { createdAt: 'desc' } });
    return filas.map(leer).filter(e => permitido(e, user)).map(e => filtrarEvaluacion(e, user));
  }

  private async cargar(proyectoId: string, id: string, user: AuthenticatedUser, tx: Prisma.TransactionClient = this.prisma) {
    const fila = await tx.evaluacionHeuristicaCompleta.findFirst({ where: { id, proyectoId } });
    if (!fila) throw new NotFoundException('La evaluación no existe en este proyecto.');
    const e = leer(fila);
    if (!permitido(e, user)) throw new ForbiddenException('No tienes acceso al flujo de esta evaluación.');
    return e;
  }

  async obtener(proyectoId: string, id: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    return filtrarEvaluacion(await this.cargar(proyectoId, id, user), user);
  }

  private async bloqueada<T>(proyectoId: string, id: string, user: AuthenticatedUser, revision: number | undefined, accion: (e: EvaluacionFlujo, tx: Prisma.TransactionClient) => Promise<T>) {
    await this.projectAccess.assertAccess(proyectoId, user);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "evaluaciones_heuristicas_completas" WHERE "id" = ${id} AND "proyectoId" = ${proyectoId} FOR UPDATE`;
      const e = await this.cargar(proyectoId, id, user, tx);
      if (revision !== undefined && e.revision !== revision) throw new ConflictException('La revisión cambió. Conserva tu borrador y vuelve a cargar antes de guardar.');
      return accion(e, tx);
    });
  }

  private coordinador(e: EvaluacionFlujo, user: AuthenticatedUser) {
    if (e.coordinadorId !== user.id) throw new ForbiddenException('Solo el coordinador puede realizar esta acción.');
  }
  private fase(e: EvaluacionFlujo, ...fases: EvaluacionFlujo['fase'][]) {
    if (!fases.includes(e.fase)) throw new ConflictException('Esta acción no está disponible en la fase actual.');
  }
  private trabajo(e: EvaluacionFlujo, user: AuthenticatedUser) {
    const t = e.trabajos.find(t => t.evaluadorId === user.id);
    if (!t) throw new ForbiddenException('Solo un experto asignado puede realizar esta acción.');
    return t;
  }
  private editable(e: EvaluacionFlujo, user: AuthenticatedUser) {
    this.fase(e, 'EN_EVALUACION');
    const t = this.trabajo(e, user);
    if (t.entregadoEn) throw new ConflictException('El trabajo entregado ya no se puede editar.');
    return t;
  }
  private async persistir(e: EvaluacionFlujo, tx: Prisma.TransactionClient, user: AuthenticatedUser) {
    const fila = await tx.evaluacionHeuristicaCompleta.update({ where: { id: e.id }, data: {
      revision: { increment: 1 }, fase: e.fase, configuracion: json(e.configuracion), trabajos: json(e.trabajos), consenso: json(e.consenso),
      informe: e.informe ? json(e.informe) : Prisma.DbNull, comparacion: e.comparacion ? json(e.comparacion) : Prisma.DbNull,
      iniciadoEn: e.iniciadoEn, consolidadoEn: e.consolidadoEn, finalizadoEn: e.finalizadoEn,
    } });
    return filtrarEvaluacion(leer(fila), user);
  }

  async configuracion(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(configuracionBodySchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.coordinador(e, user); this.fase(e, 'BORRADOR');
      await this.validarConfiguracion(proyectoId, b.configuracion, user);
      e.configuracion = b.configuracion;
      return this.persistir(e, tx, user);
    });
  }

  async iniciar(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(revisionSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.coordinador(e, user); this.fase(e, 'BORRADOR');
      await this.validarConfiguracion(proyectoId, e.configuracion, user, true);
      const miembros = await this.equipo(proyectoId, user);
      e.trabajos = e.configuracion.evaluadorIds.map(evaluadorId => ({ evaluadorId, nombre: miembros.find(m => m.id === evaluadorId)!.nombre,
        respuestas: [], hallazgos: [], entregadoEn: null, guardadoEn: null }));
      e.fase = 'EN_EVALUACION'; e.iniciadoEn = new Date().toISOString();
      return this.persistir(e, tx, user);
    });
  }

  private validarRespuestas(e: EvaluacionFlujo, respuestas: RespuestaCriterio[], completas: boolean) {
    const criterios = e.configuracion.metodologia.criterios;
    const niveles = e.configuracion.metodologia.escala.niveles;
    if (respuestas.some(r => !criterios.some(c => c.id === r.criterioId) || (r.valor !== null && !niveles.some(n => n.id === r.valor)) || (r.noAplica && r.valor !== null))) throw new BadRequestException('Respuesta con criterio/valor inválido o NA valorado.');
    if (completas && (respuestas.length !== criterios.length || respuestas.some(r => r.noAplica ? !r.motivo.trim() : r.valor === null))) throw new BadRequestException('Valora todos los criterios o justifica cada no aplica.');
  }

  private async validarHallazgos(e: EvaluacionFlujo, hallazgos: HallazgoFlujo[], tx: Prisma.TransactionClient, autorId: string | null, completos: boolean) {
    const criterios = e.configuracion.metodologia.criterios;
    if (hallazgos.some(h => h.criterioIds.some(id => !criterios.some(c => c.id === id)))) throw new BadRequestException('Hallazgo con criterio desconocido.');
    if (completos && hallazgos.some(h => !h.criterioIds.length || [h.titulo, h.pantalla, h.descripcion, h.recomendacion].some(v => !v.trim()))) throw new BadRequestException('Completa criterio, título, pantalla, descripción y recomendación de cada hallazgo.');
    const ids = [...new Set(hallazgos.flatMap(h => h.evidenciaIds))];
    if (ids.length) {
      const evidencias = await tx.evidenciaHeuristicaCompleta.findMany({ where: { id: { in: ids }, evaluacionId: e.id, ...(autorId ? { autorId } : {}) }, select: { id: true } });
      if (evidencias.length !== ids.length) throw new BadRequestException('Las evidencias deben pertenecer a esta evaluación y al autor del trabajo.');
    }
  }

  async guardarTrabajo(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(trabajoSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      const t = this.editable(e, user);
      this.validarRespuestas(e, b.respuestas, false);
      if (b.hallazgos.some(h => e.trabajos.some(otro => otro.evaluadorId !== user.id && otro.hallazgos.some(o => o.id === h.id)))) throw new BadRequestException('El identificador del hallazgo ya pertenece a otro trabajo.');
      await this.validarHallazgos(e, b.hallazgos, tx, user.id, false);
      t.respuestas = b.respuestas; t.hallazgos = b.hallazgos; t.guardadoEn = new Date().toISOString();
      return this.persistir(e, tx, user);
    });
  }

  async entregar(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(revisionSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      const t = this.editable(e, user);
      this.validarRespuestas(e, t.respuestas, true);
      await this.validarHallazgos(e, t.hallazgos, tx, user.id, true);
      t.entregadoEn = new Date().toISOString();
      if (e.trabajos.every(t => t.entregadoEn)) e.fase = 'PENDIENTE_CONSENSO';
      return this.persistir(e, tx, user);
    });
  }

  private async validarConsenso(e: EvaluacionFlujo, tx: Prisma.TransactionClient, completo: boolean) {
    if (!e.trabajos.length || e.trabajos.some(t => !t.entregadoEn)) throw new ConflictException('Faltan entregas independientes.');
    this.validarRespuestas(e, e.consenso.criterios, completo);
    if (completo && e.consenso.criterios.some(c => !c.justificacion.trim())) throw new BadRequestException('Justifica cada decisión de criterio.');
    const originales = e.trabajos.flatMap(t => t.hallazgos);
    const referencias = e.consenso.hallazgos.flatMap(h => h.origenIds);
    if (new Set(referencias).size !== referencias.length || referencias.some(id => !originales.some(h => h.id === id))) throw new BadRequestException('Cada hallazgo original debe aparecer una sola vez.');
    if (completo && (referencias.length !== originales.length || e.consenso.hallazgos.some(h => h.decision === 'PENDIENTE' || !h.origenIds.length || !h.justificacion.trim()))) throw new BadRequestException('Resuelve todos los hallazgos originales, incluida cada fusión o descarte justificado.');
    await this.validarHallazgos(e, e.consenso.hallazgos, tx, null, false);
    if (completo) await this.validarHallazgos(e, e.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO'), tx, null, true);
  }

  async guardarConsenso(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(consensoSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.fase(e, 'PENDIENTE_CONSENSO');
      if (e.coordinadorId !== user.id && !e.configuracion.evaluadorIds.includes(user.id)) throw new ForbiddenException();
      e.consenso = { criterios: b.criterios, hallazgos: b.hallazgos, aprobadoPor: [] };
      await this.validarConsenso(e, tx, false);
      return this.persistir(e, tx, user);
    });
  }

  async aprobar(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(revisionSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.fase(e, 'PENDIENTE_CONSENSO'); this.trabajo(e, user);
      await this.validarConsenso(e, tx, true);
      e.consenso.aprobadoPor = [...new Set([...e.consenso.aprobadoPor, user.id])];
      return this.persistir(e, tx, user);
    });
  }

  private informe(e: EvaluacionFlujo): InformeFlujo {
    return { version: e.version, configuracion: structuredClone(e.configuracion), consenso: structuredClone(e.consenso),
      evaluadores: e.trabajos.map(t => ({ id: t.evaluadorId, nombre: t.nombre })), iniciadoEn: e.iniciadoEn, consolidadoEn: e.consolidadoEn!, finalizadoEn: e.finalizadoEn };
  }
  async consolidar(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(revisionSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.coordinador(e, user); this.fase(e, 'PENDIENTE_CONSENSO');
      await this.validarConsenso(e, tx, true);
      if (e.configuracion.evaluadorIds.some(id => !e.consenso.aprobadoPor.includes(id))) throw new ConflictException('Todos los expertos deben aprobar la propuesta vigente.');
      e.fase = 'CONSOLIDADA'; e.consolidadoEn = new Date().toISOString(); e.informe = this.informe(e);
      return this.persistir(e, tx, user);
    });
  }
  async finalizar(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(revisionSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.coordinador(e, user); this.fase(e, 'CONSOLIDADA');
      e.fase = 'FINALIZADA'; e.finalizadoEn = new Date().toISOString(); e.informe = this.informe(e);
      return this.persistir(e, tx, user);
    });
  }

  async version(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(revisionSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.coordinador(e, user); this.fase(e, 'FINALIZADA');
      await tx.evaluacionHeuristicaCompleta.update({ where: { id }, data: { revision: { increment: 1 } } });
      const fila = await tx.evaluacionHeuristicaCompleta.create({ data: { proyectoId, coordinadorId: user.id, anteriorId: e.id, version: e.version + 1,
        configuracion: json(e.configuracion), trabajos: [], consenso: json(consensoVacio()) } });
      return filtrarEvaluacion(leer(fila), user);
    });
  }

  private meta(ev: EvidenciaHeuristicaCompleta): EvidenciaFlujo {
    return { id: ev.id, revision: ev.revision, evaluacionId: ev.evaluacionId, autorId: ev.autorId, mimeType: ev.mimeType, tamano: ev.tamano, anotaciones: ev.anotaciones as unknown as EvidenciaFlujo['anotaciones'], createdAt: ev.createdAt.toISOString() };
  }
  async subirEvidencia(proyectoId: string, id: string, archivo: ArchivoSubido | undefined, user: AuthenticatedUser) {
    if (!archivo?.buffer?.length || archivo.buffer.length > EVIDENCIA_MAX_BYTES) throw new BadRequestException('Adjunta PNG/JPEG/WebP de hasta 2 MB.');
    const mimeType = detectarMimeImagen(archivo.buffer);
    if (!mimeType) throw new UnsupportedMediaTypeException('El contenido no es PNG/JPEG/WebP.');
    return this.bloqueada(proyectoId, id, user, undefined, async (e, tx) => {
      this.editable(e, user);
      const cantidad = await tx.evidenciaHeuristicaCompleta.count({ where: { evaluacionId: id, autorId: user.id } });
      if (cantidad >= 50) throw new ConflictException('Máximo 50 capturas por experto.');
      return this.meta(await tx.evidenciaHeuristicaCompleta.create({ data: { evaluacionId: id, autorId: user.id, mimeType, tamano: archivo.buffer.length, datos: Uint8Array.from(archivo.buffer), anotaciones: [] } }));
    });
  }

  private async captura(e: EvaluacionFlujo, evidenciaId: string, user: AuthenticatedUser, tx: Prisma.TransactionClient = this.prisma) {
    const ev = await tx.evidenciaHeuristicaCompleta.findFirst({ where: { id: evidenciaId, evaluacionId: e.id } });
    if (!ev) throw new NotFoundException('La evidencia no existe en esta evaluación.');
    const compartida = ['PENDIENTE_CONSENSO', 'CONSOLIDADA', 'FINALIZADA'].includes(e.fase);
    const investigador = e.coordinadorId === user.id || e.configuracion.evaluadorIds.includes(user.id);
    const incluida = e.informe?.consenso.hallazgos.some(h => h.decision === 'ACEPTADO' && h.evidenciaIds.includes(ev.id));
    if (!(ev.autorId === user.id && e.configuracion.evaluadorIds.includes(user.id)) && !(compartida && investigador) && !(e.configuracion.lectorIds.includes(user.id) && incluida)) throw new ForbiddenException('Esta captura no está disponible para tu rol en la fase actual.');
    return ev;
  }
  async obtenerEvidencia(proyectoId: string, id: string, evidenciaId: string, user: AuthenticatedUser, metadata = false) {
    await this.projectAccess.assertAccess(proyectoId, user);
    const ev = await this.captura(await this.cargar(proyectoId, id, user), evidenciaId, user);
    return metadata ? this.meta(ev) : { mimeType: ev.mimeType, datos: Buffer.from(ev.datos) };
  }
  async anotarEvidencia(proyectoId: string, id: string, evidenciaId: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(anotacionesSchema, body);
    return this.bloqueada(proyectoId, id, user, undefined, async (e, tx) => {
      this.editable(e, user);
      const ev = await this.captura(e, evidenciaId, user, tx);
      if (ev.autorId !== user.id) throw new ForbiddenException('Solo el autor puede anotar su captura.');
      if (ev.revision !== b.revision) throw new ConflictException('La captura cambió. Conserva tus anotaciones y vuelve a cargar antes de guardar.');
      return this.meta(await tx.evidenciaHeuristicaCompleta.update({ where: { id: evidenciaId }, data: { revision: { increment: 1 }, anotaciones: json(b.anotaciones) } }));
    });
  }

  private comparar(actual: EvaluacionFlujo, anterior: EvaluacionFlujo) {
    this.fase(actual, 'FINALIZADA'); this.fase(anterior, 'FINALIZADA');
    if (actual.id === anterior.id || actual.proyectoId !== anterior.proyectoId || actual.configuracion.producto.clave !== anterior.configuracion.producto.clave) throw new BadRequestException('Compara dos evaluaciones finalizadas del mismo proyecto y producto.');
    return comprobarCompatibilidad(anterior.configuracion, actual.configuracion);
  }
  async comparacion(proyectoId: string, id: string, previaId: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    const actual = await this.cargar(proyectoId, id, user), anterior = await this.cargar(proyectoId, previaId, user);
    const compatibilidad = this.comparar(actual, anterior);
    return { previaId, ...compatibilidad, vinculos: actual.comparacion?.previaId === previaId ? actual.comparacion.vinculos : [], confirmadoPor: actual.comparacion?.previaId === previaId ? actual.comparacion.confirmadoPor : null, confirmadoEn: actual.comparacion?.previaId === previaId ? actual.comparacion.confirmadoEn : null };
  }
  async guardarComparacion(proyectoId: string, id: string, body: unknown, user: AuthenticatedUser) {
    const b = validar(comparacionSchema, body);
    return this.bloqueada(proyectoId, id, user, b.revision, async (e, tx) => {
      this.coordinador(e, user);
      const anterior = await this.cargar(proyectoId, b.previaId, user, tx), compatibilidad = this.comparar(e, anterior);
      const previos = anterior.informe!.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO').map(h => h.id);
      const actuales = e.informe!.consenso.hallazgos.filter(h => h.decision === 'ACEPTADO').map(h => h.id);
      const vistosPrevios = new Set<string>(), vistosActuales = new Set<string>();
      for (const v of b.vinculos) {
        if ((!v.anteriorId && !v.actualId) || v.anteriorId && (!previos.includes(v.anteriorId) || vistosPrevios.has(v.anteriorId)) || v.actualId && (!actuales.includes(v.actualId) || vistosActuales.has(v.actualId))) throw new BadRequestException('Vínculo con hallazgo desconocido o repetido.');
        if (!compatibilidad.compatible && !['NO_COMPARABLE', 'NO_VERIFICADO'].includes(v.estado)) throw new BadRequestException('Alcance/escala/criterios incompatibles: no se pueden confirmar cambios.');
        if (['PERMANECE', 'MEJORO', 'EMPEORO'].includes(v.estado) && (!v.anteriorId || !v.actualId) || v.estado === 'SOLUCIONADO' && (!v.anteriorId || v.actualId !== null) || v.estado === 'NUEVO' && (v.anteriorId !== null || !v.actualId)) throw new BadRequestException('El estado exige una correspondencia válida y justificación humana.');
        if (v.anteriorId) vistosPrevios.add(v.anteriorId); if (v.actualId) vistosActuales.add(v.actualId);
      }
      e.comparacion = { previaId: b.previaId, ...compatibilidad, vinculos: b.vinculos, confirmadoPor: user.id, confirmadoEn: new Date().toISOString() };
      return this.persistir(e, tx, user);
    });
  }
}
