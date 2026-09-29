import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateDocenteDto, UpdateUserRoleDto } from './dto/user.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createDocente(dto: CreateDocenteDto) {
    const email = dto.email.trim().toLowerCase();
    const existente = await this.prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      throw new ConflictException('Ese email ya está registrado.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const docente = await this.prisma.usuario.create({
      data: { nombre: dto.nombre.trim(), email, passwordHash, rol: 'DOCENTE' },
    });
    const { passwordHash: _omit, ...safe } = docente;
    return safe;
  }

  async listDocentes() {
    const docentes = await this.prisma.usuario.findMany({
      where: { rol: 'DOCENTE' },
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return docentes;
  }

  async listAccounts() {
    return this.prisma.usuario.findMany({
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
    });
  }

  async updateRole(id: string, dto: UpdateUserRoleDto, actor: AuthenticatedUser) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (usuario.id === actor.id && dto.rol !== 'ADMIN') {
      throw new BadRequestException('No puedes quitar el rol ADMIN de tu propia cuenta.');
    }

    if (usuario.rol === 'DOCENTE' && dto.rol !== 'DOCENTE') {
      const salasActivas = await this.prisma.sala.count({
        where: { profesorId: id, deletedAt: null },
      });
      if (salasActivas > 0) {
        throw new ConflictException(
          'El docente tiene salas activas. Reasígnalas o elimínalas antes de cambiar su rol.',
        );
      }
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { rol: dto.rol },
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
    });
  }

  async removeDocente(id: string) {
    const docente = await this.prisma.usuario.findUnique({ where: { id } });
    if (!docente || docente.rol !== 'DOCENTE') {
      throw new NotFoundException('Docente no encontrado.');
    }
    const salasActivas = await this.prisma.sala.count({
      where: { profesorId: id, deletedAt: null },
    });
    if (salasActivas > 0) {
      throw new ConflictException(
        'El docente tiene salas activas. Elimina o reasigna sus salas antes de borrarlo.',
      );
    }
    await this.prisma.usuario.delete({ where: { id } });
    return { eliminado: true };
  }

  async listEstudiantes(salaId?: string) {
    return this.prisma.salaEstudiante.findMany({
      where: salaId ? { salaId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
}
