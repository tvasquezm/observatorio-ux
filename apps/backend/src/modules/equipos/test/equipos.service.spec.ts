import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EquiposService } from '../equipos.service.js';
import { PrismaService } from '../../../core/database/prisma.service.js';

describe('EquiposService', () => {
  let service: EquiposService;
  let prisma: {
    sala: { findUnique: jest.Mock };
    salaEstudiante: { findUnique: jest.Mock };
    usuario: { findUnique: jest.Mock; findMany: jest.Mock };
    equipo: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    equipoMiembro: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
    proyecto: { findMany: jest.Mock };
    proyectoMiembro: { createMany: jest.Mock; count: jest.Mock; deleteMany: jest.Mock };
    revisionAccesoEquipo: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };

  const adminUser: any = { id: 'user-admin', rol: 'ADMIN' };
  const docenteDueño: any = { id: 'docente-1', rol: 'DOCENTE' };
  const docenteAjeno: any = { id: 'docente-2', rol: 'DOCENTE' };
  const estudiante: any = { id: 'est-1', rol: 'ESTUDIANTE', email: 'est1@ux.utem.cl' };
  const otroEstudiante: any = { id: 'est-2', rol: 'ESTUDIANTE', email: 'est2@ux.utem.cl' };

  const baseSala = {
    id: 'sala-1',
    profesorId: docenteDueño.id,
    deletedAt: null as Date | null,
    permiteCreacionEquipos: false,
    limiteIntegrantesEquipo: null as number | null,
  };

  beforeEach(async () => {
    prisma = {
      sala: { findUnique: jest.fn() },
      salaEstudiante: { findUnique: jest.fn() },
      usuario: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      equipo: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      equipoMiembro: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      proyecto: { findMany: jest.fn().mockResolvedValue([]) },
      proyectoMiembro: { createMany: jest.fn().mockResolvedValue({ count: 0 }), count: jest.fn().mockResolvedValue(0), deleteMany: jest.fn() },
      revisionAccesoEquipo: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EquiposService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(EquiposService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('permite al DOCENTE dueño crear un equipo aunque el toggle esté apagado', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.create.mockResolvedValue({ id: 'eq-1', salaId: 'sala-1', creadoPorId: docenteDueño.id });
      prisma.equipo.findUnique.mockResolvedValue({ id: 'eq-1', salaId: 'sala-1', creadoPorId: docenteDueño.id, miembros: [] });

      const result = await service.create('sala-1', { nombre: 'Equipo A' }, docenteDueño);

      expect(prisma.equipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ salaId: 'sala-1', nombre: 'Equipo A', creadoPorId: docenteDueño.id }),
        }),
      );
      expect(prisma.equipoMiembro.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('lanza ForbiddenException si un DOCENTE ajeno intenta crear un equipo', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);

      await expect(
        service.create('sala-1', { nombre: 'Equipo A' }, docenteAjeno),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.equipo.create).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si el toggle está apagado y un ESTUDIANTE intenta crear', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);

      await expect(
        service.create('sala-1', { nombre: 'Equipo A' }, estudiante),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.equipo.create).not.toHaveBeenCalled();
    });

    it('permite al ESTUDIANTE crear cuando el toggle está activo y pertenece a la sala, y lo agrega como miembro', async () => {
      const salaAbierta = { ...baseSala, permiteCreacionEquipos: true };
      prisma.sala.findUnique.mockResolvedValue(salaAbierta);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-1' });
      prisma.equipo.create.mockResolvedValue({ id: 'eq-1', salaId: 'sala-1', creadoPorId: estudiante.id });
      prisma.equipoMiembro.create.mockResolvedValue({ id: 'em-1' });
      prisma.equipo.findUnique.mockResolvedValue({ id: 'eq-1', salaId: 'sala-1', creadoPorId: estudiante.id, miembros: [{ usuarioId: estudiante.id }] });

      await service.create('sala-1', { nombre: 'Equipo B' }, estudiante);

      expect(prisma.equipoMiembro.create).toHaveBeenCalledWith({
        data: { equipoId: 'eq-1', usuarioId: estudiante.id },
      });
    });

    it('lanza ForbiddenException si el ESTUDIANTE no pertenece a la sala aunque el toggle esté activo', async () => {
      const salaAbierta = { ...baseSala, permiteCreacionEquipos: true };
      prisma.sala.findUnique.mockResolvedValue(salaAbierta);
      prisma.salaEstudiante.findUnique.mockResolvedValue(null);

      await expect(
        service.create('sala-1', { nombre: 'Equipo B' }, estudiante),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.equipo.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la sala no existe', async () => {
      prisma.sala.findUnique.mockResolvedValue(null);

      await expect(
        service.create('sala-x', { nombre: 'x' }, docenteDueño),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('permite al estudiante inscrito listar los equipos de su sala', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-1' });
      prisma.equipo.findMany.mockResolvedValue([{ id: 'eq-1' }]);

      const result = await service.findAll('sala-1', estudiante);
      expect(result).toEqual([{ id: 'eq-1' }]);
    });

    it('el estudiante solo lista los equipos de los que es miembro; el docente los ve todos', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-1' });
      prisma.equipo.findMany.mockResolvedValue([]);

      await service.findAll('sala-1', estudiante);
      expect(prisma.equipo.findMany.mock.calls[0][0].where).toEqual({ salaId: 'sala-1', miembros: { some: { usuarioId: estudiante.id } } });

      await service.findAll('sala-1', docenteDueño);
      expect(prisma.equipo.findMany.mock.calls[1][0].where).toEqual({ salaId: 'sala-1' });
    });

    it('lanza ForbiddenException si el estudiante no pertenece a la sala', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.salaEstudiante.findUnique.mockResolvedValue(null);

      await expect(service.findAll('sala-1', estudiante)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addMiembro', () => {
    const equipo = {
      id: 'eq-1',
      salaId: 'sala-1',
      creadoPorId: estudiante.id,
      creadoPor: { rol: 'ESTUDIANTE' },
      miembros: [{ usuarioId: estudiante.id }],
    };
    const equipoDocente = {
      id: 'eq-1',
      salaId: 'sala-1',
      creadoPorId: docenteDueño.id,
      creadoPor: { rol: 'DOCENTE' },
    };

    function prepararAgregado(eq: unknown) {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(eq);
      prisma.usuario.findUnique.mockResolvedValue(otroEstudiante);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-2' });
      prisma.equipoMiembro.findUnique.mockResolvedValue(null);
      prisma.equipoMiembro.create.mockResolvedValue({ id: 'em-2' });
    }

    it('equipo del docente: agrega al estudiante a los proyectos activos de la sala', async () => {
      prepararAgregado(equipoDocente);
      prisma.proyecto.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
      prisma.proyectoMiembro.createMany.mockResolvedValue({ count: 2 });

      await service.addMiembro('sala-1', 'eq-1', { email: otroEstudiante.email }, docenteDueño);

      expect(prisma.proyecto.findMany).toHaveBeenCalledWith({
        where: { salaId: 'sala-1', deletedAt: null },
        select: { id: true },
      });
      expect(prisma.proyectoMiembro.createMany).toHaveBeenCalledWith({
        data: [
          { proyectoId: 'p-1', usuarioId: otroEstudiante.id },
          { proyectoId: 'p-2', usuarioId: otroEstudiante.id },
        ],
        skipDuplicates: true,
      });
    });

    it('equipo del docente en sala sin proyectos: no falla ni crea membresías', async () => {
      prepararAgregado(equipoDocente);
      prisma.proyecto.findMany.mockResolvedValue([]);

      await service.addMiembro('sala-1', 'eq-1', { email: otroEstudiante.email }, docenteDueño);

      expect(prisma.proyectoMiembro.createMany).not.toHaveBeenCalled();
    });

    it('equipo creado por estudiante: no sincroniza proyectos', async () => {
      prepararAgregado(equipo);

      await service.addMiembro('sala-1', 'eq-1', { email: otroEstudiante.email }, estudiante);

      expect(prisma.proyecto.findMany).not.toHaveBeenCalled();
      expect(prisma.proyectoMiembro.createMany).not.toHaveBeenCalled();
    });

    it('agrega al estudiante cuando hay cupo', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      prisma.usuario.findUnique.mockResolvedValue(otroEstudiante);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-2' });
      prisma.equipoMiembro.findUnique.mockResolvedValue(null);
      prisma.equipoMiembro.create.mockResolvedValue({ id: 'em-2' });

      await service.addMiembro('sala-1', 'eq-1', { email: otroEstudiante.email }, estudiante);

      expect(prisma.equipoMiembro.create).toHaveBeenCalledWith({
        data: { equipoId: 'eq-1', usuarioId: otroEstudiante.id },
      });
    });

    it('lanza ConflictException si ya alcanzó el límite de integrantes', async () => {
      const salaConLimite = { ...baseSala, limiteIntegrantesEquipo: 2 };
      prisma.sala.findUnique.mockResolvedValue(salaConLimite);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      prisma.usuario.findUnique.mockResolvedValue(otroEstudiante);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-2' });
      prisma.equipoMiembro.findUnique.mockResolvedValue(null);
      prisma.equipoMiembro.count.mockResolvedValue(2);

      await expect(
        service.addMiembro('sala-1', 'eq-1', { email: otroEstudiante.email }, estudiante),
      ).rejects.toThrow(ConflictException);
      expect(prisma.equipoMiembro.create).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si el estudiante ya es miembro', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      prisma.usuario.findUnique.mockResolvedValue(otroEstudiante);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-2' });
      prisma.equipoMiembro.findUnique.mockResolvedValue({ id: 'em-existente' });

      await expect(
        service.addMiembro('sala-1', 'eq-1', { email: otroEstudiante.email }, estudiante),
      ).rejects.toThrow(ConflictException);
      expect(prisma.equipoMiembro.create).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si quien agrega no es el creador, ni docente dueño, ni ADMIN', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);

      await expect(
        service.addMiembro('sala-1', 'eq-1', { email: otroEstudiante.email }, otroEstudiante),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.equipoMiembro.create).not.toHaveBeenCalled();
    });
  });

  describe('removeMiembro', () => {
    const equipo = { id: 'eq-1', salaId: 'sala-1', creadoPorId: estudiante.id };

    it('un miembro puede salirse del equipo por su cuenta', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      prisma.equipoMiembro.findUnique.mockResolvedValue({ id: 'em-2' });
      prisma.equipoMiembro.delete.mockResolvedValue({ id: 'em-2' });

      await service.removeMiembro('sala-1', 'eq-1', otroEstudiante.id, otroEstudiante);

      expect(prisma.equipoMiembro.delete).toHaveBeenCalledWith({
        where: { equipoId_usuarioId: { equipoId: 'eq-1', usuarioId: otroEstudiante.id } },
      });
    });

    it('lanza ForbiddenException si un tercero intenta quitar a otro miembro sin ser gestor', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);

      await expect(
        service.removeMiembro('sala-1', 'eq-1', otroEstudiante.id, docenteAjeno),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.equipoMiembro.delete).not.toHaveBeenCalled();
    });
  });

  describe('el docente agrega integrantes pero no elimina equipos ni saca a nadie', () => {
    it('no puede eliminar un equipo ni quitar a un integrante, ni siquiera de un equipo que creó', async () => {
      const equipo = { id: 'eq-1', salaId: 'sala-1', creadoPorId: docenteDueño.id, nombre: 'Equipo' };
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      await expect(service.remove('sala-1', 'eq-1', docenteDueño)).rejects.toThrow('solo puedes agregar');
      await expect(service.removeMiembro('sala-1', 'eq-1', otroEstudiante.id, docenteDueño)).rejects.toThrow('solo puedes agregar');
      expect(prisma.equipo.delete).not.toHaveBeenCalled();
      expect(prisma.equipoMiembro.delete).not.toHaveBeenCalled();
    });

    it('los estudiantes siguen pudiendo salirse de su equipo', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue({ id: 'eq-1', salaId: 'sala-1', creadoPorId: estudiante.id, nombre: 'Equipo' });
      prisma.equipoMiembro.findUnique.mockResolvedValue({ id: 'em-2' });
      prisma.equipoMiembro.delete.mockResolvedValue({ id: 'em-2' });
      await service.removeMiembro('sala-1', 'eq-1', otroEstudiante.id, otroEstudiante);
      expect(prisma.equipoMiembro.delete).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('elimina el equipo y sus miembros (hard delete)', async () => {
      const equipo = { id: 'eq-1', salaId: 'sala-1', creadoPorId: docenteDueño.id, nombre: 'Equipo' };
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      prisma.equipoMiembro.deleteMany.mockResolvedValue({ count: 2 });
      prisma.equipo.delete.mockResolvedValue(equipo);

      await service.remove('sala-1', 'eq-1', adminUser);

      expect(prisma.equipoMiembro.deleteMany).toHaveBeenCalledWith({ where: { equipoId: 'eq-1' } });
      expect(prisma.equipo.delete).toHaveBeenCalledWith({ where: { id: 'eq-1' } });
    });
  });
  describe('acceso a proyectos al salir de un equipo del docente', () => {
    const equipoDocente = { id: 'eq-1', salaId: 'sala-1', creadoPorId: docenteDueño.id, nombre: 'Equipo Rojo' };
    const salir = () => service.removeMiembro('sala-1', 'eq-1', otroEstudiante.id, adminUser);
    beforeEach(() => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipoDocente);
      prisma.equipoMiembro.findUnique.mockResolvedValue({ id: 'em-2' });
      prisma.equipoMiembro.delete.mockResolvedValue({ id: 'em-2' });
      prisma.usuario.findUnique.mockResolvedValue({ rol: 'DOCENTE' });
    });

    it('queda pendiente de revisión y no se quita el acceso por su cuenta', async () => {
      prisma.proyectoMiembro.count.mockResolvedValue(2);
      await salir();
      expect(prisma.revisionAccesoEquipo.create).toHaveBeenCalledWith({ data: { salaId: 'sala-1', usuarioId: otroEstudiante.id, equipoNombre: 'Equipo Rojo' } });
      expect(prisma.proyectoMiembro.deleteMany).not.toHaveBeenCalled();
    });

    it('no pide revisión si no tenía acceso, si sigue en otro equipo del docente o si ya hay una abierta', async () => {
      prisma.proyectoMiembro.count.mockResolvedValue(0);
      await salir();
      prisma.proyectoMiembro.count.mockResolvedValue(2);
      prisma.equipoMiembro.count.mockResolvedValue(1);
      await salir();
      prisma.equipoMiembro.count.mockResolvedValue(0);
      prisma.revisionAccesoEquipo.findFirst.mockResolvedValue({ id: 'r1' });
      await salir();
      expect(prisma.revisionAccesoEquipo.create).not.toHaveBeenCalled();
    });

    it('no la pide cuando el equipo lo creó un estudiante', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: 'ESTUDIANTE' });
      prisma.proyectoMiembro.count.mockResolvedValue(2);
      await salir();
      expect(prisma.revisionAccesoEquipo.create).not.toHaveBeenCalled();
    });

    it('el docente dueño decide: quitar retira el acceso y mantener solo cierra la revisión', async () => {
      prisma.revisionAccesoEquipo.findUnique.mockResolvedValue({ id: 'r1', salaId: 'sala-1', usuarioId: otroEstudiante.id, resueltoEn: null });
      prisma.revisionAccesoEquipo.update.mockResolvedValue({});
      await service.resolverRevisionAcceso('sala-1', 'r1', { decision: 'QUITAR' }, docenteDueño);
      expect(prisma.proyectoMiembro.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: otroEstudiante.id, proyecto: { salaId: 'sala-1', creadoPorId: { not: otroEstudiante.id } } } });
      expect(prisma.revisionAccesoEquipo.update.mock.calls[0][0].data).toMatchObject({ decision: 'QUITADO', resueltoPorId: docenteDueño.id });
      prisma.proyectoMiembro.deleteMany.mockClear();
      await service.resolverRevisionAcceso('sala-1', 'r1', { decision: 'MANTENER' }, adminUser);
      expect(prisma.proyectoMiembro.deleteMany).not.toHaveBeenCalled();
      expect(prisma.revisionAccesoEquipo.update.mock.calls[1][0].data).toMatchObject({ decision: 'MANTENIDO' });
    });

    it('un docente ajeno o un estudiante no pueden ver ni resolver revisiones', async () => {
      await expect(service.listarRevisionesAcceso('sala-1', docenteAjeno)).rejects.toThrow(ForbiddenException);
      await expect(service.resolverRevisionAcceso('sala-1', 'r1', { decision: 'QUITAR' }, estudiante)).rejects.toThrow(ForbiddenException);
    });

    it('el historial muestra quién decidió y es solo del docente dueño o la administración', async () => {
      prisma.revisionAccesoEquipo.findMany.mockResolvedValue([{ id: 'r1', decision: 'QUITADO', resueltoPorId: docenteDueño.id, usuario: { id: 'est-2' } }]);
      prisma.usuario.findMany.mockResolvedValue([{ id: docenteDueño.id, nombre: 'Docente Dueño' }]);
      const historial = await service.historialRevisionesAcceso('sala-1', docenteDueño);
      expect(historial[0]).toMatchObject({ id: 'r1', resueltoPorNombre: 'Docente Dueño' });
      expect(prisma.revisionAccesoEquipo.findMany.mock.calls[0][0].where).toEqual({ salaId: 'sala-1', resueltoEn: { not: null } });
      await expect(service.historialRevisionesAcceso('sala-1', docenteAjeno)).rejects.toThrow(ForbiddenException);
    });

    it('rechaza una revisión ya resuelta', async () => {
      prisma.revisionAccesoEquipo.findUnique.mockResolvedValue({ id: 'r1', salaId: 'sala-1', usuarioId: otroEstudiante.id, resueltoEn: new Date() });
      await expect(service.resolverRevisionAcceso('sala-1', 'r1', { decision: 'QUITAR' }, docenteDueño)).rejects.toThrow(ConflictException);
    });
  });
});
