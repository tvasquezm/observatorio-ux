import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ProjectAccessService } from '../../core/access/project-access.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateCommentDto, UpdateCommentDto } from './comments.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async create(
    proyectoId: string,
    dto: CreateCommentDto,
    user: AuthenticatedUser,
  ) {
    await this.projectAccess.assertAccess(proyectoId, user);

    return this.prisma.comentario.create({
      data: {
        proyectoId,
        artefactoLogicoId: dto.artefactoLogicoId?.trim() || null,
        texto: dto.texto,
        autorId: user.id,
      },
    });
  }

  async findAll(
    proyectoId: string,
    artefactoLogicoId: string | undefined,
    user: AuthenticatedUser,
  ) {
    await this.projectAccess.assertAccess(proyectoId, user);

    return this.prisma.comentario.findMany({
      where: {
        proyectoId,
        deletedAt: null,
        ...(artefactoLogicoId ? { artefactoLogicoId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        autor: { select: { id: true, nombre: true, email: true } },
      },
    });
  }

  async update(
    comentarioId: string,
    dto: UpdateCommentDto,
    user: AuthenticatedUser,
  ) {
    const comentario = await this.findOwn(comentarioId, user);

    return this.prisma.comentario.update({
      where: { id: comentario.id },
      data: { texto: dto.texto },
    });
  }

  async softDelete(comentarioId: string, user: AuthenticatedUser) {
    const comentario = await this.findOwn(comentarioId, user);

    return this.prisma.comentario.update({
      where: { id: comentario.id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Busca el comentario y valida que el usuario sea el autor o ADMIN.
   * Usado por update/softDelete — editar/borrar es solo del propio autor.
   */
  private async findOwn(comentarioId: string, user: AuthenticatedUser) {
    const comentario = await this.prisma.comentario.findUnique({
      where: { id: comentarioId },
    });

    if (!comentario || comentario.deletedAt) {
      throw new NotFoundException('El comentario no existe.');
    }

    await this.projectAccess.assertAccess(comentario.proyectoId, user);

    if (comentario.autorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo el autor del comentario o un administrador pueden modificarlo.',
      );
    }

    return comentario;
  }
}
