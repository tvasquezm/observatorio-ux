import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { CachePorProyecto } from '../../core/cache/cache-por-proyecto.js';
import {
  CLAVES_TECNICA_COMENTARIO,
  FILTRO_COMENTARIO_GENERAL,
} from '@observatorio-ux/shared-types';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../core/access/project-access.service.js';
import { avisarProyecto } from '../artifacts/artifacts-eventos.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface.js';
import { CreateCommentDto, UpdateCommentDto } from './comments.dto.js';

@Injectable()
export class CommentsService implements OnModuleDestroy {
  /** Listados por proyecto, artefacto y técnica: la analítica del docente los pide muchas veces seguidas. */
  private readonly listados = new CachePorProyecto<Awaited<ReturnType<CommentsService['consultarListado']>>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  onModuleDestroy() {
    this.listados.cerrar();
  }

  async create(
    proyectoId: string,
    dto: CreateCommentDto,
    user: AuthenticatedUser,
  ) {
    await this.projectAccess.assertAccess(proyectoId, user);

    const comentario = await this.prisma.comentario.create({
      data: {
        proyectoId,
        artefactoLogicoId: dto.artefactoLogicoId?.trim() || null,
        ...(dto.tecnica ? { tecnica: dto.tecnica } : {}),
        texto: dto.texto,
        autorId: user.id,
      },
    });
    avisarProyecto(proyectoId, 'comentarios', user.id);
    return comentario;
  }

  async findAll(
    proyectoId: string,
    artefactoLogicoId: string | undefined,
    user: AuthenticatedUser,
    tecnica?: string,
  ) {
    await this.projectAccess.assertAccess(proyectoId, user);

    // Se valida antes de usar el caché; los datos (iguales para todos) se reutilizan unos segundos.
    if (tecnica && tecnica !== FILTRO_COMENTARIO_GENERAL && !CLAVES_TECNICA_COMENTARIO.includes(tecnica)) {
      throw new BadRequestException('La técnica indicada no es válida.');
    }
    return this.listados.obtener(proyectoId, `${artefactoLogicoId ?? ''}|${tecnica ?? ''}`, () =>
      this.consultarListado(proyectoId, artefactoLogicoId, tecnica),
    );
  }

  private consultarListado(proyectoId: string, artefactoLogicoId: string | undefined, tecnica?: string) {
    // Sin `tecnica` se devuelven todos; `general` solo los sin tecnica.
    let filtroTecnica = {};
    if (tecnica) {
      if (tecnica === FILTRO_COMENTARIO_GENERAL) {
        filtroTecnica = { tecnica: null };
      } else if (CLAVES_TECNICA_COMENTARIO.includes(tecnica)) {
        filtroTecnica = { tecnica };
      } else {
        throw new BadRequestException('La técnica indicada no es válida.');
      }
    }

    return this.prisma.comentario.findMany({
      where: {
        proyectoId,
        deletedAt: null,
        ...(artefactoLogicoId ? { artefactoLogicoId } : {}),
        ...filtroTecnica,
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

    const actualizado = await this.prisma.comentario.update({
      where: { id: comentario.id },
      data: { texto: dto.texto },
    });
    avisarProyecto(comentario.proyectoId, 'comentarios', user.id);
    return actualizado;
  }

  async softDelete(comentarioId: string, user: AuthenticatedUser) {
    const comentario = await this.findOwn(comentarioId, user);

    const borrado = await this.prisma.comentario.update({
      where: { id: comentario.id },
      data: { deletedAt: new Date() },
    });
    avisarProyecto(comentario.proyectoId, 'comentarios', user.id);
    return borrado;
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
