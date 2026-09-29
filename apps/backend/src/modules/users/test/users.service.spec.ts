import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';

describe('UsersService', () => {
  const prisma = {
    usuario: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sala: { count: jest.fn() },
  };
  const admin = { id: 'admin-1', rol: 'ADMIN' } as AuthenticatedUser;
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma as never);
  });

  it('lista todas las cuentas sin exponer passwordHash', async () => {
    prisma.usuario.findMany.mockResolvedValue([]);

    await service.listAccounts();

    expect(prisma.usuario.findMany).toHaveBeenCalledWith({
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
    });
  });

  it('permite que un administrador cambie el rol de otra cuenta', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      rol: 'ESTUDIANTE',
    });
    prisma.usuario.update.mockResolvedValue({ id: 'user-1', rol: 'DOCENTE' });

    await expect(
      service.updateRole('user-1', { rol: 'DOCENTE' }, admin),
    ).resolves.toEqual({ id: 'user-1', rol: 'DOCENTE' });
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { rol: 'DOCENTE' },
      }),
    );
  });

  it('impide que el administrador quite su propio rol', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: admin.id, rol: 'ADMIN' });

    await expect(
      service.updateRole(admin.id, { rol: 'DOCENTE' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('impide cambiar el rol de un docente con salas activas', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'teacher-1', rol: 'DOCENTE' });
    prisma.sala.count.mockResolvedValue(1);

    await expect(
      service.updateRole('teacher-1', { rol: 'ESTUDIANTE' }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('informa si la cuenta ya no existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.updateRole('missing', { rol: 'DOCENTE' }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
