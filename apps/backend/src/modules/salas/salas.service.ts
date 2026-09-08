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
  CreateProyectoEnSalaDto,
  CreateSalaDto,
  CreateSalaEstudianteDto,
  UpdateSalaEstudianteDto,
} from './dto/sala.dto';

@Injectable()
export class SalasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser) {
    return this.prisma.sala.findMany({
      where: user.rol === 'ADMIN' ? undefined : { profesorId: user.id },
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

  /**
   * Lanza NotFoundException si la sala no existe, ForbiddenException si
   * el usuario no es el profesor dueño ni ADMIN. Devuelve la sala si tiene
   * acceso (evita un segundo findUnique en el caller).
   */
  private async assertOwnerOrAdmin(salaId: string, user: AuthenticatedUser) {
    const sala = await this.prisma.sala.findUnique({ where: { id: salaId } });

    if (!sala) throw new NotFoundException('La sala no existe.');
    if (sala.profesorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo el profesor dueño de la sala o un administrador pueden hacer esto.',
      );
    }

    return sala;
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
    await this.assertOwnerOrAdmin(salaId, user);

    return this.prisma.proyecto.findMany({
      where: { salaId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sesiones: true, artefactos: true } } },
    });
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
