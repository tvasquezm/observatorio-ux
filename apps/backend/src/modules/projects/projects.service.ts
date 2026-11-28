import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface.js';
import {
  AddMemberDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './projects.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateProjectDto) {
    if (user.rol === 'ESTUDIANTE') {
      await this.assertEstudiantePuedeCrearProyecto(dto.salaId, user);
    } else if (dto.salaId) {
      // Los proyectos de una sala son de los equipos: el docente agrega integrantes y consulta, no los crea.
      if (user.rol === 'DOCENTE') throw new ForbiddenException('Los proyectos de una sala los crean los estudiantes (cada equipo el suyo). Como docente puedes agregar integrantes a los equipos y consultar sus proyectos.');
      await this.assertDocenteDuenoDeSala(dto.salaId, user);
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
                { sala: { profesorId: user.id } },
              ],
            }),
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });
  }

  adminOverview(user: AuthenticatedUser) {
    if (user.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede ver este resumen.');
    }

    return this.prisma.proyecto.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        creadoPorId: true,
        createdAt: true,
        salaId: true,
        creadoPor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        sesiones: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            nombre: true,
            tipo: true,
            estado: true,
            actor: true,
            createdAt: true,
            completadoAt: true,
          },
        },
        _count: { select: { artefactos: true } },
      },
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

    // El nombre del equipo lo editan también el docente de la sala y el resto del equipo; el nombre y la descripción del proyecto, no.
    const soloNombreEquipo = dto.nombreEquipo !== undefined && dto.nombre === undefined && dto.descripcion === undefined;
    if (user.rol === 'DOCENTE' && !soloNombreEquipo) {
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
        ...(dto.nombreEquipo !== undefined ? { nombreEquipo: dto.nombreEquipo.trim() || null } : {}),
      },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    if (user.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede eliminar proyectos.');
    }

    const project = await this.prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException('El proyecto no existe.');
    }

    await this.prisma.proyecto.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { eliminado: true };
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

    const yaEra = await this.prisma.proyectoMiembro.findUnique({
      where: { proyectoId_usuarioId: { proyectoId: id, usuarioId: usuario.id } },
      select: { id: true },
    });
    const miembro = await this.prisma.proyectoMiembro.upsert({
      where: { proyectoId_usuarioId: { proyectoId: id, usuarioId: usuario.id } },
      create: { proyectoId: id, usuarioId: usuario.id },
      update: {},
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
      },
    });
    if (!yaEra) await this.registrarEvento(id, 'AGREGADO', usuario.id, user.id);
    return miembro;
  }

  /** Deja constancia de quién agregó o quitó a quién, para que el docente vea los cambios del equipo. */
  private registrarEvento(proyectoId: string, tipo: 'AGREGADO' | 'QUITADO', usuarioId: string, actorId: string) {
    return this.prisma.proyectoMiembroEvento.create({ data: { proyectoId, tipo, usuarioId, actorId } });
  }

  /** Altas y bajas recientes de integrantes (las 100 más nuevas), con los nombres de las personas. */
  async listMemberEvents(id: string, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(id, user);
    const eventos = await this.prisma.proyectoMiembroEvento.findMany({ where: { proyectoId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
    const ids = [...new Set(eventos.flatMap((e) => [e.usuarioId, e.actorId]))];
    const nombres = new Map((ids.length ? await this.prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } }) : []).map((u) => [u.id, u.nombre]));
    return eventos.map((e) => ({ id: e.id, tipo: e.tipo, createdAt: e.createdAt, usuarioId: e.usuarioId, usuarioNombre: nombres.get(e.usuarioId) ?? 'Una persona', actorId: e.actorId, actorNombre: nombres.get(e.actorId) ?? 'Alguien del equipo' }));
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
    await this.registrarEvento(id, 'QUITADO', usuarioId, user.id);

    return { eliminado: true };
  }

  /** DOCENTE solo crea proyecto en una sala propia; ADMIN en cualquiera existente. */
  private async assertDocenteDuenoDeSala(salaId: string, user: AuthenticatedUser) {
    const sala = await this.prisma.sala.findUnique({ where: { id: salaId } });
    if (!sala || sala.deletedAt) {
      throw new NotFoundException('La sala no existe.');
    }
    if (sala.profesorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo el docente dueño de la sala o un administrador pueden crear proyectos en ella.',
      );
    }
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
