import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../core/database/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import { SalasService } from '../salas.service';

describe('SalasService', () => {
  let service: SalasService;
  let prisma: {
    $transaction: jest.Mock;
    sala: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    salaEstudiante: {
      findUnique: jest.Mock;
      deleteMany: jest.Mock;
    };
    proyecto: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    proyectoMiembro: { deleteMany: jest.Mock };
    participanteWhitelist: { deleteMany: jest.Mock };
    uxArtifact: { deleteMany: jest.Mock };
    researchSession: { deleteMany: jest.Mock };
    category: { deleteMany: jest.Mock };
    card: { deleteMany: jest.Mock };
    cardGrouping: { deleteMany: jest.Mock };
  };

  const docente = { id: 'docente-1', rol: 'DOCENTE', actor: 'EVALUADOR' } as AuthenticatedUser;
  const admin = { id: 'admin-1', rol: 'ADMIN', actor: 'EVALUADOR' } as AuthenticatedUser;
  const estudiante = {
    id: 'estudiante-1',
    email: 'Estudiante1@UX.UTEM.CL',
    rol: 'ESTUDIANTE',
    actor: 'EVALUADOR',
  } as AuthenticatedUser;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((ops) => Promise.all(ops)),
      sala: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      salaEstudiante: {
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
      proyecto: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      proyectoMiembro: { deleteMany: jest.fn() },
      participanteWhitelist: { deleteMany: jest.fn() },
      uxArtifact: { deleteMany: jest.fn() },
      researchSession: { deleteMany: jest.fn() },
      category: { deleteMany: jest.fn() },
      card: { deleteMany: jest.fn() },
      cardGrouping: { deleteMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [SalasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(SalasService);
  });

  it('limita el listado del docente a sus propias salas y selecciona campos seguros', async () => {
    prisma.sala.findMany.mockResolvedValue([]);
    await service.findAll(docente);
    expect(prisma.sala.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, profesorId: docente.id },
      orderBy: { createdAt: 'desc' },
      include: {
        profesor: { select: { id: true, nombre: true, email: true, rol: true } },
      },
    });
  });

  it('permite al administrador listar todas las salas sin exponer passwordHash', async () => {
    prisma.sala.findMany.mockResolvedValue([]);
    await service.findAll(admin);
    const query = prisma.sala.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ deletedAt: null });
    expect(query.include.profesor.select.passwordHash).toBeUndefined();
  });

  it('rechaza un rango cuya fecha de término no sea posterior al inicio', async () => {
    await expect(
      service.create(
        {
          nombre: 'Sala UX',
          periodo: '2026-2',
          fechaInicio: '2026-09-10T12:00:00.000Z',
          fechaFin: '2026-09-10T11:00:00.000Z',
        },
        docente.id,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sala.create).not.toHaveBeenCalled();
  });

  it('muestra al estudiante solo las salas donde está registrado por correo', async () => {
    prisma.sala.findMany.mockResolvedValue([]);
    await service.findAll(estudiante);
    expect(prisma.sala.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        estudiantes: {
          some: { email: 'estudiante1@ux.utem.cl' },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        profesor: { select: { id: true, nombre: true, email: true, rol: true } },
      },
    });
  });

  it('permite al estudiante entrar a una sala donde está registrado', async () => {
    const sala = {
      id: 'sala-1',
      profesorId: docente.id,
      profesor: { id: docente.id, nombre: 'Docente', email: 'docente@ux.cl', rol: 'DOCENTE' },
    };
    prisma.sala.findUnique.mockResolvedValue(sala);
    prisma.salaEstudiante.findUnique.mockResolvedValue({ id: 'inscripcion-1' });

    await expect(service.findOne('sala-1', estudiante)).resolves.toEqual(sala);
    expect(prisma.salaEstudiante.findUnique).toHaveBeenCalledWith({
      where: {
        salaId_email: {
          salaId: 'sala-1',
          email: 'estudiante1@ux.utem.cl',
        },
      },
      select: { id: true },
    });
  });

  it('impide que el estudiante entre a una sala donde no está registrado', async () => {
    prisma.sala.findUnique.mockResolvedValue({
      id: 'sala-ajena',
      profesorId: docente.id,
      profesor: { id: docente.id },
    });
    prisma.salaEstudiante.findUnique.mockResolvedValue(null);

    await expect(service.findOne('sala-ajena', estudiante)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permite al docente dueño actualizar las fechas y datos de su sala', async () => {
    prisma.sala.findUnique.mockResolvedValue({
      id: 'sala-1',
      profesorId: docente.id,
      fechaInicio: new Date('2026-09-10T12:00:00.000Z'),
      fechaFin: new Date('2026-12-10T12:00:00.000Z'),
    });
    prisma.sala.update.mockResolvedValue({ id: 'sala-1' });

    await service.update(
      'sala-1',
      {
        nombre: '  Sala de accesibilidad  ',
        periodo: ' 2026-2 ',
        instrucciones: '  Revisión semanal  ',
        fechaInicio: '2026-09-15T12:00:00.000Z',
        fechaFin: '2026-12-15T12:00:00.000Z',
      },
      docente,
    );

    expect(prisma.sala.update).toHaveBeenCalledWith({
      where: { id: 'sala-1' },
      data: {
        nombre: 'Sala de accesibilidad',
        periodo: '2026-2',
        instrucciones: 'Revisión semanal',
        fechaInicio: new Date('2026-09-15T12:00:00.000Z'),
        fechaFin: new Date('2026-12-15T12:00:00.000Z'),
      },
    });
  });

  it('valida el rango actualizado contra la fecha existente', async () => {
    prisma.sala.findUnique.mockResolvedValue({
      id: 'sala-1',
      profesorId: docente.id,
      fechaInicio: new Date('2026-09-10T12:00:00.000Z'),
      fechaFin: new Date('2026-12-10T12:00:00.000Z'),
    });

    await expect(
      service.update(
        'sala-1',
        { fechaFin: '2026-09-09T12:00:00.000Z' },
        docente,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sala.update).not.toHaveBeenCalled();
  });

  it('impide que otro docente edite una sala ajena', async () => {
    prisma.sala.findUnique.mockResolvedValue({
      id: 'sala-1',
      profesorId: 'otro-docente',
      fechaInicio: null,
      fechaFin: null,
    });

    await expect(
      service.update('sala-1', { nombre: 'Cambio no autorizado' }, docente),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.sala.update).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Fase 2 (PLAN_AJUSTES.md): soft delete (20 días) + hard delete ADMIN
  // ---------------------------------------------------------------

  describe('softDelete', () => {
    it('marca deletedAt en la sala y en cascada en sus proyectos activos', async () => {
      prisma.sala.findUnique.mockResolvedValue({ id: 'sala-1', profesorId: docente.id, deletedAt: null });
      prisma.sala.update.mockResolvedValue({});
      prisma.proyecto.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.softDelete('sala-1', docente);

      expect(prisma.sala.update).toHaveBeenCalledWith({
        where: { id: 'sala-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prisma.proyecto.updateMany).toHaveBeenCalledWith({
        where: { salaId: 'sala-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.eliminado).toBe(true);
      expect(result.recuperableHasta).toBeInstanceOf(Date);
    });

    it('impide que un docente que no es dueño elimine la sala', async () => {
      prisma.sala.findUnique.mockResolvedValue({ id: 'sala-1', profesorId: 'otro-docente', deletedAt: null });

      await expect(service.softDelete('sala-1', docente)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.sala.update).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('revierte el soft delete dentro de la ventana de 20 días', async () => {
      const hace5Dias = new Date();
      hace5Dias.setDate(hace5Dias.getDate() - 5);
      prisma.sala.findUnique.mockResolvedValue({ id: 'sala-1', profesorId: docente.id, deletedAt: hace5Dias });
      prisma.sala.update.mockResolvedValue({});
      prisma.proyecto.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.restore('sala-1', docente)).resolves.toEqual({ restaurado: true });
      expect(prisma.sala.update).toHaveBeenCalledWith({
        where: { id: 'sala-1' },
        data: { deletedAt: null },
      });
      expect(prisma.proyecto.updateMany).toHaveBeenCalledWith({
        where: { salaId: 'sala-1', deletedAt: hace5Dias },
        data: { deletedAt: null },
      });
    });

    it('rechaza restaurar si ya pasaron los 20 días de ventana', async () => {
      const hace21Dias = new Date();
      hace21Dias.setDate(hace21Dias.getDate() - 21);
      prisma.sala.findUnique.mockResolvedValue({ id: 'sala-1', profesorId: docente.id, deletedAt: hace21Dias });

      await expect(service.restore('sala-1', docente)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.sala.update).not.toHaveBeenCalled();
    });

    it('rechaza restaurar una sala que no está eliminada', async () => {
      prisma.sala.findUnique.mockResolvedValue({ id: 'sala-1', profesorId: docente.id, deletedAt: null });

      await expect(service.restore('sala-1', docente)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('hardDelete', () => {
    it('rechaza si el texto de confirmación no es exactamente "DELETE"', async () => {
      await expect(
        service.hardDelete('sala-1', { confirm: 'delete' }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.sala.findUnique).not.toHaveBeenCalled();
    });

    it('rechaza el hard delete si el usuario no es ADMIN', async () => {
      // El controller ya restringe @Roles('ADMIN'), pero el service también
      // exige dueño/ADMIN vía assertOwnerOrAdmin como segunda barrera.
      prisma.sala.findUnique.mockResolvedValue({ id: 'sala-1', profesorId: 'otro-docente', deletedAt: null });

      await expect(
        service.hardDelete('sala-1', { confirm: 'DELETE' }, docente),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('borra en cascada real: cards, sesiones, artefactos, whitelist, miembros, proyectos y la sala', async () => {
      prisma.sala.findUnique.mockResolvedValue({ id: 'sala-1', profesorId: admin.id, deletedAt: null });
      prisma.proyecto.findMany.mockResolvedValue([{ id: 'proyecto-1' }, { id: 'proyecto-2' }]);
      prisma.cardGrouping.deleteMany.mockResolvedValue({ count: 0 });
      prisma.card.deleteMany.mockResolvedValue({ count: 0 });
      prisma.category.deleteMany.mockResolvedValue({ count: 0 });
      prisma.researchSession.deleteMany.mockResolvedValue({ count: 0 });
      prisma.uxArtifact.deleteMany.mockResolvedValue({ count: 0 });
      prisma.participanteWhitelist.deleteMany.mockResolvedValue({ count: 0 });
      prisma.proyectoMiembro.deleteMany.mockResolvedValue({ count: 0 });
      prisma.proyecto.deleteMany.mockResolvedValue({ count: 2 });
      prisma.salaEstudiante.deleteMany.mockResolvedValue({ count: 0 });
      prisma.sala.delete.mockResolvedValue({});

      const result = await service.hardDelete('sala-1', { confirm: 'DELETE' }, admin);

      expect(prisma.proyecto.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['proyecto-1', 'proyecto-2'] } },
      });
      expect(prisma.sala.delete).toHaveBeenCalledWith({ where: { id: 'sala-1' } });
      expect(result).toEqual({ eliminadoDefinitivamente: true, proyectosEliminados: 2 });
    });
  });
});
