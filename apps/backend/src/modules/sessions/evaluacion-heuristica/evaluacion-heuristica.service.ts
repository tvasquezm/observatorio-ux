import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSesion, Prisma, ResearchSession, TipoSesion } from '../../../generated/prisma/client.js';
import { HEURISTICA_IDS } from '@observatorio-ux/shared-types';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface.js';
import {
  ActualizarHallazgoDto,
  CrearSesionHeuristicaDto,
  HeuristicaDto,
} from './dto/heuristica.dto.js';

export interface HeuristicFinding {
  id: string;
  heuristicaId: string;
  severidad: number;
  descripcion: string;
  evidencia: string | null;
  recomendacion: string | null;
  registradoEn: string;
  // Campos agregados con el rediseño del módulo. Los hallazgos legados
  // (guardados antes) no los tienen: todo lector debe tolerar su ausencia.
  titulo?: string;
  pantalla?: string;
  evidenciaUrl?: string | null;
  evidenciaArchivoId?: string | null;
  responsable?: { id: string; nombre: string };
  actualizadoEn?: string;
}

const NOMBRE_SESION_POR_DEFECTO = 'Evaluación heurística';

function leerHallazgos(resultado: Prisma.JsonValue | null): HeuristicFinding[] {
  return Array.isArray(resultado) ? (resultado as unknown as HeuristicFinding[]) : [];
}

@Injectable()
export class EvaluacionHeuristicaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async crearSesion(proyectoId: string, body: CrearSesionHeuristicaDto, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);

    return this.prisma.researchSession.create({
      data: {
        proyectoId,
        // El default del modelo es "Card Sorting"; aquí se fija explícitamente.
        nombre: body?.nombre?.trim() || NOMBRE_SESION_POR_DEFECTO,
        evaluadorId: user.id,
        tipo: TipoSesion.EVALUACION_HEURISTICA,
        estado: EstadoSesion.EN_PROGRESO,
        actor: 'EVALUADOR',
        resultado: [],
      },
    });
  }

  async registrarHallazgo(sesionId: string, body: HeuristicaDto, user: AuthenticatedUser) {
    // El responsable lo fija el servidor desde el usuario autenticado.
    const responsable = await this.resolverResponsable(user);

    return this.conSesionBloqueada(sesionId, user, async (session, tx) => {
      await this.assertEvidenciaDeSesion(tx, sesionId, body.evidenciaArchivoId);

      const finding: HeuristicFinding = {
        id: randomUUID(),
        heuristicaId: body.heuristicaId,
        severidad: body.severidad,
        titulo: body.titulo.trim(),
        pantalla: body.pantalla.trim(),
        descripcion: body.descripcion.trim(),
        evidencia: body.evidencia.trim(),
        evidenciaUrl: body.evidenciaUrl?.trim() || null,
        evidenciaArchivoId: body.evidenciaArchivoId ?? null,
        recomendacion: body.recomendacion.trim(),
        responsable,
        registradoEn: new Date().toISOString(),
      };

      const sesion = await this.persistir(tx, sesionId, [...leerHallazgos(session.resultado), finding]);
      return { mensaje: 'Hallazgo registrado correctamente.', hallazgo: finding, sesion };
    });
  }

  async actualizarHallazgo(
    sesionId: string,
    hallazgoId: string,
    body: ActualizarHallazgoDto,
    user: AuthenticatedUser,
  ) {
    return this.conSesionBloqueada(sesionId, user, async (session, tx) => {
      const hallazgos = leerHallazgos(session.resultado);
      const idx = hallazgos.findIndex((h) => h.id === hallazgoId);
      if (idx === -1) throw new NotFoundException('El hallazgo no existe.');
      const previo = hallazgos[idx];

      const cambios: Partial<HeuristicFinding> = {};
      if (body.heuristicaId !== undefined) cambios.heuristicaId = body.heuristicaId;
      if (body.severidad !== undefined) cambios.severidad = body.severidad;
      if (body.titulo !== undefined) cambios.titulo = body.titulo.trim();
      if (body.pantalla !== undefined) cambios.pantalla = body.pantalla.trim();
      if (body.descripcion !== undefined) cambios.descripcion = body.descripcion.trim();
      if (body.evidencia !== undefined) cambios.evidencia = body.evidencia.trim();
      if (body.recomendacion !== undefined) cambios.recomendacion = body.recomendacion.trim();
      if (body.evidenciaUrl !== undefined) cambios.evidenciaUrl = body.evidenciaUrl?.trim() || null;

      if (body.evidenciaArchivoId !== undefined) {
        await this.assertEvidenciaDeSesion(tx, sesionId, body.evidenciaArchivoId);
        cambios.evidenciaArchivoId = body.evidenciaArchivoId;
      }

      const actualizado: HeuristicFinding = {
        ...previo,
        ...cambios,
        actualizadoEn: new Date().toISOString(),
      };
      const nuevos = hallazgos.map((h, i) => (i === idx ? actualizado : h));

      if (previo.evidenciaArchivoId && previo.evidenciaArchivoId !== actualizado.evidenciaArchivoId) {
        await this.liberarEvidencia(tx, sesionId, previo.evidenciaArchivoId, nuevos);
      }

      const sesion = await this.persistir(tx, sesionId, nuevos);
      return { mensaje: 'Hallazgo actualizado correctamente.', hallazgo: actualizado, sesion };
    });
  }

  async eliminarHallazgo(sesionId: string, hallazgoId: string, user: AuthenticatedUser) {
    return this.conSesionBloqueada(sesionId, user, async (session, tx) => {
      const hallazgos = leerHallazgos(session.resultado);
      const eliminado = hallazgos.find((h) => h.id === hallazgoId);
      if (!eliminado) throw new NotFoundException('El hallazgo no existe.');

      const restantes = hallazgos.filter((h) => h.id !== hallazgoId);
      if (eliminado.evidenciaArchivoId) {
        await this.liberarEvidencia(tx, sesionId, eliminado.evidenciaArchivoId, restantes);
      }

      const sesion = await this.persistir(tx, sesionId, restantes);
      return { mensaje: 'Hallazgo eliminado correctamente.', sesion };
    });
  }

  async finalizarSesion(sesionId: string, user: AuthenticatedUser) {
    return this.conSesionBloqueada(
      sesionId,
      user,
      async (session, tx) => {
        // Capturas subidas que ningún hallazgo referencia (subidas y abandonadas).
        const referenciadas = leerHallazgos(session.resultado)
          .map((h) => h.evidenciaArchivoId)
          .filter((id): id is string => !!id);
        await tx.evidenciaHeuristica.deleteMany({
          where: { sesionId, id: { notIn: referenciadas } },
        });

        return tx.researchSession.update({
          where: { id: sesionId },
          data: { estado: EstadoSesion.COMPLETADO, completadoAt: new Date() },
        });
      },
      'La sesión ya fue finalizada.',
    );
  }

  async obtenerSesion(sesionId: string, user: AuthenticatedUser) {
    return this.getOwnedSession(sesionId, user);
  }

  async listarSesiones(proyectoId: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);
    // La exportación no amplía el permiso de lectura de sesiones individuales.
    return this.prisma.researchSession.findMany({
      where: {
        proyectoId,
        tipo: TipoSesion.EVALUACION_HEURISTICA,
        ...(user.rol === 'ADMIN' ? {} : { evaluadorId: user.id }),
      },
      select: {
        id: true, proyectoId: true, nombre: true, estado: true, resultado: true,
        createdAt: true, completadoAt: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Analítica agregada de hallazgos heurísticos para un proyecto,
   * calculada sobre las sesiones reales (todas las de tipo
   * EVALUACION_HEURISTICA del proyecto, no solo la del usuario actual
   * si es ADMIN). Distribución por severidad 0-4 y por heurística H1-H10.
   * No incluye SUS/NPS: no existe en el modelo ningún mecanismo de
   * encuesta que produzca esos puntajes.
   */
  async obtenerAnalitica(proyectoId: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(proyectoId, user);

    const sesiones = await this.prisma.researchSession.findMany({
      where: { proyectoId, tipo: TipoSesion.EVALUACION_HEURISTICA },
    });

    const porSeveridad = [0, 0, 0, 0, 0]; // índice = severidad 0..4
    const porHeuristica = new Map<string, number>(HEURISTICA_IDS.map((id) => [id, 0]));
    let total = 0;
    let sinClasificar = 0; // heurística fuera del catálogo (hallazgos legados)
    let sesionesCompletadas = 0;

    for (const s of sesiones) {
      if (s.estado === EstadoSesion.COMPLETADO) sesionesCompletadas++;
      for (const h of leerHallazgos(s.resultado)) {
        if (h.severidad >= 0 && h.severidad <= 4) {
          porSeveridad[h.severidad]++;
          total++;
          if (porHeuristica.has(h.heuristicaId)) {
            porHeuristica.set(h.heuristicaId, (porHeuristica.get(h.heuristicaId) ?? 0) + 1);
          } else {
            sinClasificar++;
          }
        }
      }
    }

    return {
      sesionesTotal: sesiones.length,
      sesionesCompletadas,
      hallazgosTotal: total,
      porSeveridad: porSeveridad.map((count, severidad) => ({
        severidad,
        count,
        porcentaje: total > 0 ? Math.round((count / total) * 100) : 0,
      })),
      porHeuristica: [...porHeuristica.entries()].map(([heuristicaId, count]) => ({
        heuristicaId,
        count,
      })),
      sinClasificar,
    };
  }

  // -------------------------------------------------------------------------

  private async resolverResponsable(user: AuthenticatedUser) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: { id: true, nombre: true },
    });
    if (!usuario) throw new ForbiddenException('El usuario no existe.');
    return { id: usuario.id, nombre: usuario.nombre };
  }

  /**
   * Las escrituras sobre `resultado` (JSON) son leer-modificar-escribir:
   * sin bloqueo, dos requests simultáneos se pisan. Se serializan con un
   * SELECT ... FOR UPDATE de la fila de la sesión dentro de una transacción.
   */
  private async conSesionBloqueada<T>(
    sesionId: string,
    user: AuthenticatedUser,
    fn: (session: ResearchSession, tx: Prisma.TransactionClient) => Promise<T>,
    mensajeCerrada = 'La sesión ya no está abierta para edición.',
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "research_sessions" WHERE "id" = ${sesionId} FOR UPDATE`;
      const session = await this.getOwnedSession(sesionId, user, tx);
      if (session.estado !== EstadoSesion.EN_PROGRESO) {
        throw new ConflictException(mensajeCerrada);
      }
      return fn(session, tx);
    });
  }

  private persistir(tx: Prisma.TransactionClient, sesionId: string, hallazgos: HeuristicFinding[]) {
    return tx.researchSession.update({
      where: { id: sesionId },
      data: { resultado: hallazgos as unknown as Prisma.InputJsonValue },
    });
  }

  private async assertEvidenciaDeSesion(
    tx: Prisma.TransactionClient,
    sesionId: string,
    evidenciaId: string | null | undefined,
  ) {
    if (!evidenciaId) return;
    const existe = await tx.evidenciaHeuristica.findFirst({
      where: { id: evidenciaId, sesionId },
      select: { id: true },
    });
    if (!existe) throw new BadRequestException('La captura indicada no existe en esta sesión.');
  }

  /** Borra la captura solo si ningún otro hallazgo la sigue referenciando. */
  private async liberarEvidencia(
    tx: Prisma.TransactionClient,
    sesionId: string,
    evidenciaId: string,
    hallazgosResultantes: HeuristicFinding[],
  ) {
    if (hallazgosResultantes.some((h) => h.evidenciaArchivoId === evidenciaId)) return;
    await tx.evidenciaHeuristica.deleteMany({ where: { id: evidenciaId, sesionId } });
  }

  private async getOwnedSession(
    sesionId: string,
    user: AuthenticatedUser,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const session = await db.researchSession.findUnique({
      where: { id: sesionId },
    });

    if (!session || session.tipo !== TipoSesion.EVALUACION_HEURISTICA) {
      throw new NotFoundException('La sesión de evaluación no existe.');
    }

    if (user.rol !== 'ADMIN' && session.evaluadorId !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta sesión.');
    }

    return session;
  }
}
