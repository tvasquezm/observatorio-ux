import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../core/database/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import { SalasService } from '../salas.service';

describe('SalasService', () => {
  let service: SalasService;
  let prisma: {
    sala: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const docente = { id: 'docente-1', rol: 'DOCENTE', actor: 'EVALUADOR' } as AuthenticatedUser;
  const admin = { id: 'admin-1', rol: 'ADMIN', actor: 'EVALUADOR' } as AuthenticatedUser;

  beforeEach(async () => {
    prisma = {
      sala: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
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
      where: { profesorId: docente.id },
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
    expect(query.where).toBeUndefined();
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
});
