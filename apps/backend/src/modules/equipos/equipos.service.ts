import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Sala } from '../../generated/prisma/client.js';
import { PrismaService } from '../../core/database/prisma.service.js';
import { vincularMiembroAProyectosDeSala } from '../../core/access/equipo-proyecto.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface.js';
import { AddMiembroEquipoDto, CreateEquipoDto, ResolverRevisionAccesoDto, UpdateEquipoDto } from './equipos.dto.js';

@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  async create(salaId: string, dto: CreateEquipoDto, user: AuthenticatedUser) {
    const sala = await this.getSalaOrThrow(salaId);
    await this.assertPuedeCrear(sala, user);

    const equipo = await this.prisma.equipo.create({
      data: {
        salaId,
        nombre: dto.nombre.trim(),
        creadoPorId: user.id,
      },
    });

    // El estudiante que crea el equipo queda como primer miembro. El
    // DOCENTE/ADMIN que crea un equipo no se agrega como miembro (los
    // equipos son de estudiantes).
    if (user.rol === 'ESTUDIANTE') {
      await this.prisma.equipoMiembro.create({
        data: { equipoId: equipo.id, usuarioId: user.id },
      });
    }

    return this.findOne(salaId, equipo.id, user);
  }

  async findAll(salaId: string, user: AuthenticatedUser) {
    const sala = await this.getSalaOrThrow(salaId);
    await this.assertLectura(sala, user);

    // Un estudiante solo ve los equipos de los que forma parte; docente y administrador ven todos.
    return this.prisma.equipo.findMany({
      where: { salaId, ...(user.rol === 'ESTUDIANTE' ? { miembros: { some: { usuarioId: user.id } } } : {}) },
      orderBy: { createdAt: 'asc' },
      include: { miembros: { include: { usuario: { select: { id: true, nombre: true, email: true } } } } },
    });
  }

  async findOne(salaId: string, equipoId: string, user: AuthenticatedUser) {
    const sala = await this.getSalaOrThrow(salaId);
    await this.assertLectura(sala, user);

    const equipo = await this.prisma.equipo.findUnique({
      where: { id: equipoId },
      include: { miembros: { include: { usuario: { select: { id: true, nombre: true, email: true } } } } },
    });

    if (!equipo || equipo.salaId !== salaId || (user.rol === 'ESTUDIANTE' && !equipo.miembros.some(m => m.usuarioId === user.id))) {
      throw new NotFoundException('El equipo no existe en esta sala.');
    }

    return equipo;
  }

  async update(
    salaId: string,
    equipoId: string,
    dto: UpdateEquipoDto,
    user: AuthenticatedUser,
  ) {
    const { sala, equipo } = await this.getEquipoDeSalaOrThrow(salaId, equipoId);
    await this.assertPuedeGestionar(sala, equipo, user);

    return this.prisma.equipo.update({
      where: { id: equipoId },
      data: { nombre: dto.nombre.trim() },
    });
  }

  async remove(salaId: string, equipoId: string, user: AuthenticatedUser) {
    const { sala, equipo } = await this.getEquipoDeSalaOrThrow(salaId, equipoId);
    await this.assertPuedeGestionar(sala, equipo, user);

    const integrantes = await this.prisma.equipoMiembro.findMany({ where: { equipoId }, select: { usuarioId: true } });
    await this.prisma.equipoMiembro.deleteMany({ where: { equipoId } });
    const eliminado = await this.prisma.equipo.delete({ where: { id: equipoId } });
    await this.pedirRevisionDeAcceso(sala.id, equipo.creadoPorId, eliminado.nombre, integrantes.map(i => i.usuarioId));
    return eliminado;
  }

  async addMiembro(
    salaId: string,
    equipoId: string,
    dto: AddMiembroEquipoDto,
    user: AuthenticatedUser,
  ) {
    const { sala, equipo } = await this.getEquipoDeSalaOrThrow(salaId, equipoId);
    await this.assertPuedeGestionar(sala, equipo, user);

    const email = dto.email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    if (!usuario || usuario.rol !== 'ESTUDIANTE') {
      throw new NotFoundException('No existe un estudiante registrado con ese email.');
    }

    await this.assertEsEstudianteDeSala(salaId, usuario.email);

    const yaEsMiembro = await this.prisma.equipoMiembro.findUnique({
      where: { equipoId_usuarioId: { equipoId, usuarioId: usuario.id } },
    });
    if (yaEsMiembro) {
      throw new ConflictException('El estudiante ya es miembro de este equipo.');
    }

    if (sala.limiteIntegrantesEquipo != null) {
      const total = await this.prisma.equipoMiembro.count({ where: { equipoId } });
      if (total >= sala.limiteIntegrantesEquipo) {
        throw new ConflictException(
          `El equipo ya alcanzó el límite de ${sala.limiteIntegrantesEquipo} integrantes.`,
        );
      }
    }

    await this.prisma.equipoMiembro.create({
      data: { equipoId, usuarioId: usuario.id },
    });

    await vincularMiembroAProyectosDeSala(this.prisma, equipoId, usuario.id);

    return this.findOne(salaId, equipoId, user);
  }

  async removeMiembro(
    salaId: string,
    equipoId: string,
    usuarioId: string,
    user: AuthenticatedUser,
  ) {
    const { sala, equipo } = await this.getEquipoDeSalaOrThrow(salaId, equipoId);

    const esUnoMismo = user.id === usuarioId;
    if (!esUnoMismo) {
      await this.assertPuedeGestionar(sala, equipo, user);
    }

    const miembro = await this.prisma.equipoMiembro.findUnique({
      where: { equipoId_usuarioId: { equipoId, usuarioId } },
    });
    if (!miembro) {
      throw new NotFoundException('Ese usuario no es miembro de este equipo.');
    }

    const eliminado = await this.prisma.equipoMiembro.delete({
      where: { equipoId_usuarioId: { equipoId, usuarioId } },
    });
    await this.pedirRevisionDeAcceso(sala.id, equipo.creadoPorId, equipo.nombre, [usuarioId]);
    return eliminado;
  }

  // ---------------------------------------------------------------
  // Acceso a proyectos al salir de un equipo: lo decide el docente
  // ---------------------------------------------------------------

  /**
   * Quien sale de un equipo creado por el docente conserva el acceso a los proyectos de la sala
   * hasta que el docente decida. Se omite si aún pertenece a otro equipo del docente o si no tenía
   * acceso por haber sido agregado (los proyectos que creó son suyos y no cuentan).
   */
  private async pedirRevisionDeAcceso(salaId: string, equipoCreadoPorId: string, equipoNombre: string, usuarioIds: string[]) {
    const creador = await this.prisma.usuario.findUnique({ where: { id: equipoCreadoPorId }, select: { rol: true } });
    if (!creador || creador.rol === 'ESTUDIANTE') return;
    for (const usuarioId of usuarioIds) {
      const sigueEnOtro = await this.prisma.equipoMiembro.count({ where: { usuarioId, equipo: { salaId, creadoPor: { rol: { in: ['DOCENTE', 'ADMIN'] } } } } });
      if (sigueEnOtro) continue;
      const conAcceso = await this.prisma.proyectoMiembro.count({ where: { usuarioId, proyecto: { salaId, deletedAt: null, creadoPorId: { not: usuarioId } } } });
      if (!conAcceso) continue;
      const abierta = await this.prisma.revisionAccesoEquipo.findFirst({ where: { salaId, usuarioId, resueltoEn: null }, select: { id: true } });
      if (abierta) continue;
      await this.prisma.revisionAccesoEquipo.create({ data: { salaId, usuarioId, equipoNombre } });
    }
  }

  async listarRevisionesAcceso(salaId: string, user: AuthenticatedUser) {
    const sala = await this.getSalaOrThrow(salaId);
    this.assertDuenoOAdmin(sala, user);
    return this.prisma.revisionAccesoEquipo.findMany({
      where: { salaId, resueltoEn: null },
      orderBy: { createdAt: 'asc' },
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
    });
  }

  async resolverRevisionAcceso(salaId: string, revisionId: string, dto: ResolverRevisionAccesoDto, user: AuthenticatedUser) {
    const sala = await this.getSalaOrThrow(salaId);
    this.assertDuenoOAdmin(sala, user);
    const revision = await this.prisma.revisionAccesoEquipo.findUnique({ where: { id: revisionId } });
    if (!revision || revision.salaId !== salaId) throw new NotFoundException('La revisión no existe en esta sala.');
    if (revision.resueltoEn) throw new ConflictException('Esta revisión ya se resolvió.');

    if (dto.decision === 'QUITAR') {
      const volvio = await this.prisma.equipoMiembro.count({ where: { usuarioId: revision.usuarioId, equipo: { salaId } } });
      if (volvio) throw new ConflictException('La persona volvió a un equipo de la sala: quítala del equipo antes de retirar su acceso.');
      await this.prisma.proyectoMiembro.deleteMany({ where: { usuarioId: revision.usuarioId, proyecto: { salaId, creadoPorId: { not: revision.usuarioId } } } });
    }
    return this.prisma.revisionAccesoEquipo.update({
      where: { id: revisionId },
      data: { resueltoEn: new Date(), resueltoPorId: user.id, decision: dto.decision === 'QUITAR' ? 'QUITADO' : 'MANTENIDO' },
    });
  }

  private assertDuenoOAdmin(sala: Sala, user: AuthenticatedUser) {
    if (user.rol === 'ADMIN' || (user.rol === 'DOCENTE' && sala.profesorId === user.id)) return;
    throw new ForbiddenException('Solo el docente dueño de la sala o un administrador pueden revisar accesos.');
  }

  // ---------------------------------------------------------------
  // Helpers de acceso
  // ---------------------------------------------------------------

  private async getSalaOrThrow(salaId: string): Promise<Sala> {
    const sala = await this.prisma.sala.findUnique({ where: { id: salaId } });
    if (!sala || sala.deletedAt) {
      throw new NotFoundException('La sala no existe.');
    }
    return sala;
  }

  private async getEquipoDeSalaOrThrow(salaId: string, equipoId: string) {
    const sala = await this.getSalaOrThrow(salaId);
    const equipo = await this.prisma.equipo.findUnique({ where: { id: equipoId } });

    if (!equipo || equipo.salaId !== salaId) {
      throw new NotFoundException('El equipo no existe en esta sala.');
    }

    return { sala, equipo };
  }

  /** Lectura (listar/ver equipos): dueño de la sala, ADMIN, o estudiante inscrito en la sala. */
  private async assertLectura(sala: Sala, user: AuthenticatedUser) {
    if (user.rol === 'ADMIN') return;
    if (user.rol === 'DOCENTE' && sala.profesorId === user.id) return;
    if (user.rol === 'ESTUDIANTE') {
      await this.assertEsEstudianteDeSala(sala.id, user.email);
      return;
    }
    throw new ForbiddenException('No tienes acceso a los equipos de esta sala.');
  }

  /** Crear equipo: dueño de la sala, ADMIN siempre; ESTUDIANTE solo si el toggle lo permite. */
  private async assertPuedeCrear(sala: Sala, user: AuthenticatedUser) {
    if (user.rol === 'ADMIN') return;
    if (user.rol === 'DOCENTE' && sala.profesorId === user.id) return;
    if (user.rol === 'ESTUDIANTE') {
      if (!sala.permiteCreacionEquipos) {
        throw new ForbiddenException('Esta sala no permite que los estudiantes creen equipos.');
      }
      await this.assertEsEstudianteDeSala(sala.id, user.email);
      return;
    }
    throw new ForbiddenException('No puedes crear equipos en esta sala.');
  }

  /** Gestionar (editar/eliminar/agregar-quitar miembros): creador del equipo, dueño de la sala, o ADMIN. */
  private async assertPuedeGestionar(
    sala: Sala,
    equipo: { creadoPorId: string },
    user: AuthenticatedUser,
  ) {
    if (user.rol === 'ADMIN') return;
    if (user.rol === 'DOCENTE' && sala.profesorId === user.id) return;
    if (equipo.creadoPorId === user.id) return;
    throw new ForbiddenException(
      'Solo el creador del equipo, el docente dueño de la sala, o un administrador pueden hacer esto.',
    );
  }

  private async assertEsEstudianteDeSala(salaId: string, email: string | undefined) {
    if (!email) {
      throw new ForbiddenException('No se pudo identificar el correo del estudiante.');
    }
    const inscrito = await this.prisma.salaEstudiante.findUnique({
      where: { salaId_email: { salaId, email: email.trim().toLowerCase() } },
    });
    if (!inscrito) {
      throw new ForbiddenException('El estudiante no pertenece a esta sala.');
    }
  }
}
