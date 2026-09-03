import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSesion, Prisma, TipoSesion } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import { HeuristicaDto } from './dto/heuristica.dto';

export interface HeuristicFinding {
  id: string;
  heuristicaId: string;
  severidad: number;
  descripcion: string;
  evidencia: string | null;
  recomendacion: string | null;
  registradoEn: string;
}

@Injectable()
export class EvaluacionHeuristicaService {
  constructor(private readonly prisma: PrismaService) {}

  async crearSesion(proyectoId: string, user: AuthenticatedUser) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
    });

    if (!project) throw new NotFoundException('El proyecto no existe.');
    if (project.creadoPorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException('No tienes acceso a este proyecto.');
    }

    return this.prisma.researchSession.create({
      data: {
        proyectoId,
        evaluadorId: user.id,
        tipo: TipoSesion.EVALUACION_HEURISTICA,
        estado: EstadoSesion.EN_PROGRESO,
        actor: 'EVALUADOR',
        resultado: [],
      },
    });
  }

  async registrarHallazgo(
    sesionId: string,
    body: HeuristicaDto,
    user: AuthenticatedUser,
  ) {
    const session = await this.getOwnedSession(sesionId, user);

    if (session.estado !== EstadoSesion.EN_PROGRESO) {
      throw new ConflictException('La sesión ya no está abierta para edición.');
    }

    const current = Array.isArray(session.resultado)
      ? (session.resultado as unknown as HeuristicFinding[])
      : [];
    const finding: HeuristicFinding = {
      id: randomUUID(),
      heuristicaId: body.heuristicaId,
      severidad: body.severidad,
      descripcion: body.descripcion.trim(),
      evidencia: body.evidencia?.trim() || null,
      recomendacion: body.recomendacion?.trim() || null,
      registradoEn: new Date().toISOString(),
    };

    const updated = await this.prisma.researchSession.update({
      where: { id: sesionId },
      data: {
        resultado: [...current, finding] as unknown as Prisma.InputJsonValue,
      },
    });

    return { mensaje: 'Hallazgo registrado correctamente.', hallazgo: finding, sesion: updated };
  }

  async finalizarSesion(sesionId: string, user: AuthenticatedUser) {
    const session = await this.getOwnedSession(sesionId, user);

    if (session.estado !== EstadoSesion.EN_PROGRESO) {
      throw new ConflictException('La sesión ya fue finalizada.');
    }

    return this.prisma.researchSession.update({
      where: { id: sesionId },
      data: { estado: EstadoSesion.COMPLETADO, completadoAt: new Date() },
    });
  }

  async obtenerSesion(sesionId: string, user: AuthenticatedUser) {
    return this.getOwnedSession(sesionId, user);
  }

  /**
   * Analítica agregada de hallazgos heurísticos para un proyecto,
   * calculada sobre las sesiones reales (todas las de tipo
   * EVALUACION_HEURISTICA del proyecto, no solo la del usuario actual
   * si es ADMIN). Distribución por severidad 0-4 + totales.
   * No incluye SUS/NPS: no existe en el modelo ningún mecanismo de
   * encuesta que produzca esos puntajes.
   */
  async obtenerAnalitica(proyectoId: string, user: AuthenticatedUser) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
    });
    if (!project) throw new NotFoundException('El proyecto no existe.');
    if (project.creadoPorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException('No tienes acceso a este proyecto.');
    }

    const sesiones = await this.prisma.researchSession.findMany({
      where: { proyectoId, tipo: TipoSesion.EVALUACION_HEURISTICA },
    });

    const porSeveridad = [0, 0, 0, 0, 0]; // índice = severidad 0..4
    let total = 0;
    let sesionesCompletadas = 0;

    for (const s of sesiones) {
      if (s.estado === EstadoSesion.COMPLETADO) sesionesCompletadas++;
      const hallazgos = Array.isArray(s.resultado)
        ? (s.resultado as unknown as HeuristicFinding[])
        : [];
      for (const h of hallazgos) {
        if (h.severidad >= 0 && h.severidad <= 4) {
          porSeveridad[h.severidad]++;
          total++;
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
    };
  }

  private async getOwnedSession(sesionId: string, user: AuthenticatedUser) {
    const session = await this.prisma.researchSession.findUnique({
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
