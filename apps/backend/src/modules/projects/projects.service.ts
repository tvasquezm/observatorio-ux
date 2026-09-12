import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { ProjectAccessService } from '../../core/access/project-access.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import {
  AddMemberDto,
  AddToWhitelistDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateProjectDto) {
    if (user.rol === 'ESTUDIANTE') {
      await this.assertEstudiantePuedeCrearProyecto(dto.salaId, user);
    }

    return this.prisma.proyecto.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim(),
        creadoPorId: user.id,
        ...(dto.salaId ? { salaId: dto.salaId } : {}),
      },
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.proyecto.findMany({
      where: {
        deletedAt: null,
        ...(user.rol === 'ADMIN'
          ? {}
          : {
              OR: [
                { creadoPorId: user.id },
                { miembros: { some: { usuarioId: user.id } } },
              ],
            }),
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(id, user);

    const project = await this.prisma.proyecto.findUnique({
      where: { id },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });

    if (!project || project.deletedAt) {
      throw new NotFoundException('El proyecto no existe.');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: AuthenticatedUser) {
    await this.findOne(id, user);

    if (user.rol === 'DOCENTE') {
      const proyecto = await this.prisma.proyecto.findUnique({
        where: { id },
        select: { creadoPor: { select: { rol: true } } },
      });

      if (proyecto?.creadoPor.rol === 'ESTUDIANTE') {
        throw new ForbiddenException(
          'Un docente no puede editar un proyecto creado por un estudiante.',
        );
      }
    }

    return this.prisma.proyecto.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: dto.descripcion.trim() }
          : {}),
      },
    });
  }

  async addToWhitelist(
    id: string,
    dto: AddToWhitelistDto,
    user: AuthenticatedUser,
  ) {
    await this.projectAccess.assertOwnerOrAdmin(
      id,
      user,
      'Solo el creador del proyecto o un administrador pueden invitar participantes.',
    );

    const invitaciones = await this.prisma.$transaction(async (tx) => {
      const creadas: Array<{ email: string; codigoInvitacion: string }> = [];
      const participantesUnicos = new Map(
        dto.participantes.map((participante) => [
          participante.email.trim().toLowerCase(),
          participante,
        ]),
      );

      for (const [email, participante] of participantesUnicos) {
        const existente = await tx.participanteWhitelist.findUnique({
          where: { proyectoId_email: { proyectoId: id, email } },
        });

        // Volver a agregar una invitación todavía pendiente rota el código.
        // Así el docente puede recuperarse si perdió el valor mostrado una vez.
        if (existente?.participanteId) continue;

        const codigoInvitacion = randomBytes(18).toString('base64url');
        const codigoInvitacionHash = createHash('sha256').update(codigoInvitacion).digest('hex');

        if (existente) {
          await tx.participanteWhitelist.update({
            where: { id: existente.id },
            data: { codigoInvitacionHash },
          });
        } else {
          await tx.participanteWhitelist.create({
            data: {
              proyectoId: id,
              email,
              nombre: participante.nombre?.trim(),
              creadoPorId: user.id,
              codigoInvitacionHash,
            },
          });
        }

        creadas.push({ email, codigoInvitacion });
      }

      return creadas;
    });

    return {
      agregados: invitaciones.length,
      enviados: dto.participantes.length,
      invitaciones,
    };
  }

  async listWhitelist(id: string, user: AuthenticatedUser) {
    await this.projectAccess.assertOwnerOrAdmin(
      id,
      user,
      'Solo el creador del proyecto o un administrador pueden ver las invitaciones.',
    );

    return this.prisma.participanteWhitelist.findMany({
      where: { proyectoId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        nombre: true,
        usado: true,
        createdAt: true,
      },
    });
  }

  async listMembers(id: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(id, user);

    return this.prisma.proyectoMiembro.findMany({
      where: { proyectoId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
      },
    });
  }

  async addMember(id: string, dto: AddMemberDto, user: AuthenticatedUser) {
    await this.projectAccess.assertOwnerOrAdmin(
      id,
      user,
      'Solo el creador del proyecto o un administrador pueden agregar miembros.',
    );

    const email = dto.email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      throw new NotFoundException('No existe un usuario registrado con ese email.');
    }

    return this.prisma.proyectoMiembro.upsert({
      where: { proyectoId_usuarioId: { proyectoId: id, usuarioId: usuario.id } },
      create: { proyectoId: id, usuarioId: usuario.id },
      update: {},
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
      },
    });
  }

  async removeMember(id: string, usuarioId: string, user: AuthenticatedUser) {
    const project = await this.projectAccess.assertOwnerOrAdmin(
      id,
      user,
      'Solo el creador del proyecto o un administrador pueden quitar miembros.',
    );

    if (project.creadoPorId === usuarioId) {
      throw new BadRequestException('No puedes quitar al creador del proyecto.');
    }

    const membresia = await this.prisma.proyectoMiembro.findUnique({
      where: { proyectoId_usuarioId: { proyectoId: id, usuarioId } },
    });

    if (!membresia) {
      throw new NotFoundException('Ese usuario no es miembro de este proyecto.');
    }

    await this.prisma.proyectoMiembro.delete({ where: { id: membresia.id } });

    return { eliminado: true };
  }

  /**
   * Fase 5: ESTUDIANTE solo crea proyecto si la sala lo permite
   * (`permiteCreacionProyectos`) y está inscrito en ella. Mismo patrón que
   * EquiposService.assertPuedeCrear / assertEsEstudianteDeSala.
   */
  private async assertEstudiantePuedeCrearProyecto(
    salaId: string | undefined,
    user: AuthenticatedUser,
  ) {
    if (!salaId) {
      throw new ForbiddenException(
        'Los estudiantes solo pueden crear proyectos dentro de una sala que lo permita.',
      );
    }

    const sala = await this.prisma.sala.findUnique({ where: { id: salaId } });
    if (!sala || sala.deletedAt) {
      throw new NotFoundException('La sala no existe.');
    }

    if (!sala.permiteCreacionProyectos) {
      throw new ForbiddenException('Esta sala no permite que los estudiantes creen proyectos.');
    }

    if (!user.email) {
      throw new ForbiddenException('No se pudo identificar el correo del estudiante.');
    }

    const inscrito = await this.prisma.salaEstudiante.findUnique({
      where: { salaId_email: { salaId, email: user.email.trim().toLowerCase() } },
    });

    if (!inscrito) {
      throw new ForbiddenException('El estudiante no pertenece a esta sala.');
    }
  }
}
