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
