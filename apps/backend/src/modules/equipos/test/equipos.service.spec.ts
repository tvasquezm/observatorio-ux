import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EquiposService } from '../equipos.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('EquiposService', () => {
  let service: EquiposService;
  let prisma: {
    sala: { findUnique: jest.Mock };
    salaEstudiante: { findUnique: jest.Mock };
    usuario: { findUnique: jest.Mock };
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
    };
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
      usuario: { findUnique: jest.fn() },
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
      },
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
      prisma.equipo.findUnique.mockResolvedValue({ id: 'eq-1', salaId: 'sala-1', creadoPorId: estudiante.id, miembros: [] });

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

    it('lanza ForbiddenException si el estudiante no pertenece a la sala', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.salaEstudiante.findUnique.mockResolvedValue(null);

      await expect(service.findAll('sala-1', estudiante)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addMiembro', () => {
    const equipo = { id: 'eq-1', salaId: 'sala-1', creadoPorId: estudiante.id };

    it('agrega al estudiante cuando hay cupo', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      prisma.usuario.findUnique.mockResolvedValue(otroEstudiante);
      prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'se-2' });
      prisma.equipoMiembro.findUnique.mockResolvedValue(null);
      prisma.equipoMiembro.create.mockResolvedValue({ id: 'em-2' });

      await service.addMiembro('sala-1', 'eq-1', { usuarioId: otroEstudiante.id }, estudiante);

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
        service.addMiembro('sala-1', 'eq-1', { usuarioId: otroEstudiante.id }, estudiante),
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
        service.addMiembro('sala-1', 'eq-1', { usuarioId: otroEstudiante.id }, estudiante),
      ).rejects.toThrow(ConflictException);
      expect(prisma.equipoMiembro.create).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si quien agrega no es el creador, ni docente dueño, ni ADMIN', async () => {
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);

      await expect(
        service.addMiembro('sala-1', 'eq-1', { usuarioId: otroEstudiante.id }, otroEstudiante),
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

  describe('remove', () => {
    it('elimina el equipo y sus miembros (hard delete)', async () => {
      const equipo = { id: 'eq-1', salaId: 'sala-1', creadoPorId: docenteDueño.id };
      prisma.sala.findUnique.mockResolvedValue(baseSala);
      prisma.equipo.findUnique.mockResolvedValue(equipo);
      prisma.equipoMiembro.deleteMany.mockResolvedValue({ count: 2 });
      prisma.equipo.delete.mockResolvedValue(equipo);

      await service.remove('sala-1', 'eq-1', docenteDueño);

      expect(prisma.equipoMiembro.deleteMany).toHaveBeenCalledWith({ where: { equipoId: 'eq-1' } });
      expect(prisma.equipo.delete).toHaveBeenCalledWith({ where: { id: 'eq-1' } });
    });
  });
});
