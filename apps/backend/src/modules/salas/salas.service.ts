import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service'; // o tu ruta de prisma service
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import {
  BulkCreateSalaEstudiantesDto,
  ConfirmHardDeleteDto,
  CreateProyectoEnSalaDto,
  CreateSalaDto,
  CreateSalaEstudianteDto,
  UpdateSalaDto,
  UpdateSalaEstudianteDto,
} from './dto/sala.dto';

// Ventana de recuperación tras un soft delete de Sala. Pasado este plazo,
// solo queda el hard delete definitivo (ADMIN + confirmación).
const DIAS_VENTANA_RECUPERACION = 20;

@Injectable()
export class SalasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    if (user.rol === 'ESTUDIANTE' && !user.email) {
      throw new ForbiddenException('No se pudo identificar el correo del estudiante.');
    }

    return this.prisma.sala.findMany({
      where: {
        deletedAt: null,
        ...(user.rol === 'ADMIN'
          ? {}
          : user.rol === 'ESTUDIANTE'
            ? { estudiantes: { some: { email: user.email!.trim().toLowerCase() } } }
            : { profesorId: user.id }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        profesor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
      },
    });
  }

  async create(createSalaDto: CreateSalaDto, userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('No se encontró el usuario autenticado para crear la sala.');
    }

    const fechaInicio = new Date(createSalaDto.fechaInicio);
    const fechaFin = new Date(createSalaDto.fechaFin);
    if (fechaFin <= fechaInicio) {
      throw new BadRequestException('La fecha de término debe ser posterior a la fecha de inicio.');
    }

    return this.prisma.sala.create({
      data: {
        nombre: createSalaDto.nombre,
        periodo: createSalaDto.periodo,
        instrucciones: createSalaDto.instrucciones,
        fechaInicio,
        fechaFin,
        profesor: {
          connect: { id: userId },
        },
      },
    });
  }

  async findOne(salaId: string, user: AuthenticatedUser) {
    return this.assertCanViewSala(salaId, user);
  }

  async update(salaId: string, dto: UpdateSalaDto, user: AuthenticatedUser) {
    const sala = await this.assertOwnerOrAdmin(salaId, user);
    const fechaInicio = dto.fechaInicio !== undefined
      ? new Date(dto.fechaInicio)
      : sala.fechaInicio;
    const fechaFin = dto.fechaFin !== undefined
      ? new Date(dto.fechaFin)
      : sala.fechaFin;

    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      throw new BadRequestException('La fecha de término debe ser posterior a la fecha de inicio.');
    }

    return this.prisma.sala.update({
      where: { id: salaId },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.periodo !== undefined ? { periodo: dto.periodo.trim() } : {}),
        ...(dto.instrucciones !== undefined
          ? { instrucciones: dto.instrucciones.trim() || null }
          : {}),
        ...(dto.fechaInicio !== undefined ? { fechaInicio } : {}),
        ...(dto.fechaFin !== undefined ? { fechaFin } : {}),
      },
    });
  }

  /**
   * Lanza NotFoundException si la sala no existe (o está soft-deleted,
   * salvo allowDeleted), ForbiddenException si el usuario no es el
   * profesor dueño ni ADMIN. Devuelve la sala si tiene acceso (evita un
   * segundo findUnique en el caller).
   */
  private async assertOwnerOrAdmin(
    salaId: string,
    user: AuthenticatedUser,
    options: { allowDeleted?: boolean } = {},
  ) {
    const sala = await this.prisma.sala.findUnique({ where: { id: salaId } });

    if (!sala || (!options.allowDeleted && sala.deletedAt)) {
      throw new NotFoundException('La sala no existe.');
    }
    if (sala.profesorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo el profesor dueño de la sala o un administrador pueden hacer esto.',
      );
    }

    return sala;
  }

  private async assertCanViewSala(salaId: string, user: AuthenticatedUser) {
    const sala = await this.prisma.sala.findUnique({
      where: { id: salaId },
      include: {
        profesor: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
      },
    });

    if (!sala || sala.deletedAt) throw new NotFoundException('La sala no existe.');
    if (user.rol === 'ADMIN' || sala.profesorId === user.id) return sala;

    if (user.rol === 'ESTUDIANTE' && user.email) {
      const inscripcion = await this.prisma.salaEstudiante.findUnique({
        where: {
          salaId_email: {
            salaId,
            email: user.email.trim().toLowerCase(),
          },
        },
        select: { id: true },
      });
      if (inscripcion) return sala;
    }

    throw new ForbiddenException('No tienes acceso a esta sala.');
  }

  // ---------------------------------------------------------------
  // Estudiantes (registro liviano, sin cuenta)
  // ---------------------------------------------------------------

  async listEstudiantes(salaId: string, user: AuthenticatedUser) {
    await this.assertOwnerOrAdmin(salaId, user);

    return this.prisma.salaEstudiante.findMany({
      where: { salaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addEstudiante(
    salaId: string,
    dto: CreateSalaEstudianteDto,
    user: AuthenticatedUser,
  ) {
    await this.assertOwnerOrAdmin(salaId, user);

    const email = dto.email.trim().toLowerCase();
    const existente = await this.prisma.salaEstudiante.findUnique({
      where: { salaId_email: { salaId, email } },
    });

    if (existente) {
      throw new ConflictException('Ese email ya está registrado en esta sala.');
    }

    return this.prisma.salaEstudiante.create({
      data: { salaId, email, nombre: dto.nombre?.trim() },
    });
  }

  async addEstudiantesBulk(
    salaId: string,
    dto: BulkCreateSalaEstudiantesDto,
    user: AuthenticatedUser,
  ) {
    await this.assertOwnerOrAdmin(salaId, user);

    const result = await this.prisma.salaEstudiante.createMany({
      data: dto.estudiantes.map((e) => ({
        salaId,
        email: e.email.trim().toLowerCase(),
        nombre: e.nombre?.trim(),
      })),
      skipDuplicates: true,
    });

    return { agregados: result.count, enviados: dto.estudiantes.length };
  }

  async updateEstudiante(
    salaId: string,
    estudianteId: string,
    dto: UpdateSalaEstudianteDto,
    user: AuthenticatedUser,
  ) {
    await this.assertOwnerOrAdmin(salaId, user);

    const estudiante = await this.prisma.salaEstudiante.findUnique({
      where: { id: estudianteId },
    });

    if (!estudiante || estudiante.salaId !== salaId) {
      throw new NotFoundException('El estudiante no existe en esta sala.');
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const duplicado = await this.prisma.salaEstudiante.findUnique({
        where: { salaId_email: { salaId, email } },
      });
      if (duplicado && duplicado.id !== estudianteId) {
        throw new ConflictException('Ese email ya está registrado en esta sala.');
      }
    }

    return this.prisma.salaEstudiante.update({
      where: { id: estudianteId },
      data: {
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      },
    });
  }

  async removeEstudiante(
    salaId: string,
    estudianteId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertOwnerOrAdmin(salaId, user);

    const estudiante = await this.prisma.salaEstudiante.findUnique({
      where: { id: estudianteId },
    });

    if (!estudiante || estudiante.salaId !== salaId) {
      throw new NotFoundException('El estudiante no existe en esta sala.');
    }

    await this.prisma.salaEstudiante.delete({ where: { id: estudianteId } });

    return { eliminado: true };
  }

  // ---------------------------------------------------------------
  // Proyectos alojados en la sala
  // ---------------------------------------------------------------

  async listProyectos(salaId: string, user: AuthenticatedUser) {
    await this.assertCanViewSala(salaId, user);

    return this.prisma.proyecto.findMany({
      where: { salaId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });
  }

  // ---------------------------------------------------------------
  // Borrado de Sala: soft delete (20 días recuperable) + hard delete ADMIN
  // ---------------------------------------------------------------

  /**
   * Soft delete de la Sala + cascada lógica a sus Proyecto (quedan
   * ocultos, no se borran). Recuperable durante DIAS_VENTANA_RECUPERACION.
   */
  async softDelete(salaId: string, user: AuthenticatedUser) {
    await this.assertOwnerOrAdmin(salaId, user);

    const ahora = new Date();
    await this.prisma.$transaction([
      this.prisma.sala.update({
        where: { id: salaId },
        data: { deletedAt: ahora },
      }),
      this.prisma.proyecto.updateMany({
        where: { salaId, deletedAt: null },
        data: { deletedAt: ahora },
      }),
    ]);

    return { eliminado: true, recuperableHasta: this.finVentana(ahora) };
  }

  /**
   * Revierte un soft delete, siempre que esté dentro de la ventana de
   * recuperación. Restaura también los Proyecto que quedaron ocultos por
   * la cascada del soft delete original.
   */
  async restore(salaId: string, user: AuthenticatedUser) {
    const sala = await this.assertOwnerOrAdmin(salaId, user, { allowDeleted: true });

    if (!sala.deletedAt) {
      throw new BadRequestException('Esta sala no está eliminada.');
    }
    if (new Date() > this.finVentana(sala.deletedAt)) {
      throw new BadRequestException(
        `La ventana de recuperación de ${DIAS_VENTANA_RECUPERACION} días ya venció. ` +
          'Esta sala ya no se puede restaurar.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.sala.update({
        where: { id: salaId },
        data: { deletedAt: null },
      }),
      this.prisma.proyecto.updateMany({
        where: { salaId, deletedAt: sala.deletedAt },
        data: { deletedAt: null },
      }),
    ]);

    return { restaurado: true };
  }

  /**
   * Borrado físico definitivo, exclusivo ADMIN (ver Roles en el
   * controller). Requiere confirmación exacta `"DELETE"`. Borra en
   * cascada, en orden de dependencia real (la FK real es RESTRICT en
   * casi toda la cadena, así que no hay cascada automática de Postgres).
   */
  async hardDelete(salaId: string, dto: ConfirmHardDeleteDto, user: AuthenticatedUser) {
    if (dto.confirm !== 'DELETE') {
      throw new BadRequestException('Debes escribir "DELETE" para confirmar el borrado definitivo.');
    }

    const sala = await this.assertOwnerOrAdmin(salaId, user, { allowDeleted: true });

    const proyectos = await this.prisma.proyecto.findMany({
      where: { salaId },
      select: { id: true },
    });
    const proyectoIds = proyectos.map((p) => p.id);

    await this.prisma.$transaction([
      this.prisma.cardGrouping.deleteMany({
        where: { participanteSesion: { proyectoId: { in: proyectoIds } } },
      }),
      this.prisma.card.deleteMany({
        where: { session: { proyectoId: { in: proyectoIds } } },
      }),
      this.prisma.category.deleteMany({
        where: { session: { proyectoId: { in: proyectoIds } } },
      }),
      this.prisma.researchSession.deleteMany({
        where: { proyectoId: { in: proyectoIds } },
      }),
      this.prisma.uxArtifact.deleteMany({
        where: { proyectoId: { in: proyectoIds } },
      }),
      this.prisma.participanteWhitelist.deleteMany({
        where: { proyectoId: { in: proyectoIds } },
      }),
      this.prisma.proyectoMiembro.deleteMany({
        where: { proyectoId: { in: proyectoIds } },
      }),
      this.prisma.proyecto.deleteMany({ where: { id: { in: proyectoIds } } }),
      this.prisma.salaEstudiante.deleteMany({ where: { salaId } }),
      this.prisma.sala.delete({ where: { id: salaId } }),
    ]);

    return { eliminadoDefinitivamente: true, proyectosEliminados: proyectoIds.length };
  }

  private finVentana(desde: Date): Date {
    const fin = new Date(desde);
    fin.setDate(fin.getDate() + DIAS_VENTANA_RECUPERACION);
    return fin;
  }

  async createProyectoEnSala(
    salaId: string,
    dto: CreateProyectoEnSalaDto,
    user: AuthenticatedUser,
  ) {
    await this.assertOwnerOrAdmin(salaId, user);

    return this.prisma.proyecto.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim(),
        creadoPorId: user.id,
        salaId,
      },
    });
  }

  async vincularProyecto(
    salaId: string,
    proyectoId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertOwnerOrAdmin(salaId, user);

    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
    });

    if (!proyecto) throw new NotFoundException('El proyecto no existe.');
    if (proyecto.creadoPorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo el creador del proyecto o un administrador pueden vincularlo a una sala.',
      );
    }
    if (proyecto.salaId) {
      throw new ConflictException('Ese proyecto ya está vinculado a una sala.');
    }

    return this.prisma.proyecto.update({
      where: { id: proyectoId },
      data: { salaId },
    });
  }

  async desvincularProyecto(
    salaId: string,
    proyectoId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertOwnerOrAdmin(salaId, user);

    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
    });

    if (!proyecto || proyecto.salaId !== salaId) {
      throw new NotFoundException('El proyecto no está vinculado a esta sala.');
    }

    await this.prisma.proyecto.update({
      where: { id: proyectoId },
      data: { salaId: null },
    });

    return { desvinculado: true };
  }
}
