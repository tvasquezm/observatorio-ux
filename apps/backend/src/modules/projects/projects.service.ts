import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthenticatedUser, dto: CreateProjectDto) {
    return this.prisma.proyecto.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim(),
        creadoPorId: user.id,
      },
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.proyecto.findMany({
      where: user.rol === 'ADMIN' ? undefined : { creadoPorId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });

    if (!project) throw new NotFoundException('El proyecto no existe.');

    if (project.creadoPorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException('No tienes acceso a este proyecto.');
    }

    return project;
  }
}
