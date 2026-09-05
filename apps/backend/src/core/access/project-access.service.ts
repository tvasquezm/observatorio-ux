import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.interface';

/**
 * Chequeo de acceso a proyecto compartido entre módulos (Artifacts,
 * Projects, CardSorting, EvaluacionHeuristica). Antes cada servicio
 * reimplementaba su propia versión de "dueño o ADMIN"; esta versión
 * también reconoce ProyectoMiembro (ver AUDIT_LOG F5).
 */
@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lanza NotFoundException si el proyecto no existe, ForbiddenException
   * si el usuario no es dueño, ADMIN, ni miembro. No lanza nada si tiene
   * acceso.
   */
  async assertAccess(
    proyectoId: string,
    user: AuthenticatedUser,
    mensajeForbidden = 'No tienes acceso a este proyecto.',
  ): Promise<void> {
    const project = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { creadoPorId: true },
    });

    if (!project) throw new NotFoundException('El proyecto no existe.');
    if (project.creadoPorId === user.id || user.rol === 'ADMIN') return;

    const esMiembro = await this.prisma.proyectoMiembro.findUnique({
      where: { proyectoId_usuarioId: { proyectoId, usuarioId: user.id } },
      select: { id: true },
    });

    if (!esMiembro) throw new ForbiddenException(mensajeForbidden);
  }

  /**
   * Igual que assertAccess, pero exige ser dueño o ADMIN — un miembro no
   * alcanza. Usado para operaciones administrativas del proyecto (ej.
   * gestionar la membresía). Devuelve el proyecto para evitar un segundo
   * findUnique en el caller.
   */
  async assertOwnerOrAdmin(
    proyectoId: string,
    user: AuthenticatedUser,
    mensajeForbidden = 'Solo el creador del proyecto o un administrador pueden hacer esto.',
  ): Promise<{ creadoPorId: string }> {
    const project = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { creadoPorId: true },
    });

    if (!project) throw new NotFoundException('El proyecto no existe.');
    if (project.creadoPorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException(mensajeForbidden);
    }

    return project;
  }
}
