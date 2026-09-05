import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    await this.projectAccess.assertAccess(id, user);

    const project = await this.prisma.proyecto.findUnique({
      where: { id },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });

    if (!project) throw new NotFoundException('El proyecto no existe.');

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: AuthenticatedUser) {
    await this.findOne(id, user);

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
    await this.findOne(id, user);

    const result = await this.prisma.participanteWhitelist.createMany({
      data: dto.participantes.map((p) => ({
        proyectoId: id,
        email: p.email.trim().toLowerCase(),
        nombre: p.nombre?.trim(),
        creadoPorId: user.id,
      })),
      skipDuplicates: true,
    });

    return { agregados: result.count, enviados: dto.participantes.length };
  }

  async listWhitelist(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);

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
}