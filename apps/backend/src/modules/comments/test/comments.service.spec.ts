import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreateCommentDto } from '../comments.dto.js';
import { CommentsService } from '../comments.service.js';
import { PrismaService } from '../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../core/access/project-access.service.js';

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: {
    proyecto: { findUnique: jest.Mock };
    proyectoMiembro: { findUnique: jest.Mock };
    comentario: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const adminUser: any = { id: 'user-admin', rol: 'ADMIN' };
  const ownerUser: any = { id: 'user-owner', rol: 'DOCENTE' };
  const otherUser: any = { id: 'user-other', rol: 'DOCENTE' };

  beforeEach(async () => {
    prisma = {
      proyecto: { findUnique: jest.fn() },
      proyectoMiembro: { findUnique: jest.fn() },
      comentario: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        ProjectAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CommentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('crea el comentario cuando el usuario tiene acceso al proyecto', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.create.mockResolvedValue({ id: 'com-1' });

      const result = await service.create(
        'proy-1',
        { texto: 'Comentario de prueba' },
        ownerUser,
      );

      expect(prisma.comentario.create).toHaveBeenCalledWith({
        data: {
          proyectoId: 'proy-1',
          artefactoLogicoId: null,
          texto: 'Comentario de prueba',
          autorId: ownerUser.id,
        },
      });
      expect(result).toEqual({ id: 'com-1' });
    });

    it('guarda artefactoLogicoId cuando se envía', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.create.mockResolvedValue({ id: 'com-1' });

      await service.create(
        'proy-1',
        { texto: 'x', artefactoLogicoId: 'logico-1' },
        ownerUser,
      );

      expect(prisma.comentario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ artefactoLogicoId: 'logico-1' }),
        }),
      );
    });

    it('guarda la técnica cuando se envía y no la incluye si falta', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.create.mockResolvedValue({ id: 'com-1' });

      await service.create('proy-1', { texto: 'x', tecnica: 'personas' }, ownerUser);
      expect(prisma.comentario.create.mock.calls[0][0].data).toHaveProperty('tecnica', 'personas');

      await service.create('proy-1', { texto: 'x' }, ownerUser);
      expect(prisma.comentario.create.mock.calls[1][0].data).not.toHaveProperty('tecnica');
    });

    it('el DTO rechaza una técnica fuera de la lista y acepta una válida', async () => {
      const invalido = Object.assign(new CreateCommentDto(), { texto: 'x', tecnica: 'otra' });
      const valido = Object.assign(new CreateCommentDto(), { texto: 'x', tecnica: 'card-sorting' });
      expect(await validate(invalido)).toHaveLength(1);
      expect(await validate(valido)).toHaveLength(0);
    });

    it('lanza NotFoundException si el proyecto no existe', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(null);

      await expect(
        service.create('proy-x', { texto: 'x' }, ownerUser),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.comentario.create).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si el usuario no tiene acceso al proyecto', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(
        service.create('proy-1', { texto: 'x' }, otherUser),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.comentario.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('filtra por artefactoLogicoId cuando se especifica', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.findMany.mockResolvedValue([{ id: 'com-1' }]);

      const result = await service.findAll('proy-1', 'logico-1', ownerUser);

      expect(prisma.comentario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            proyectoId: 'proy-1',
            deletedAt: null,
            artefactoLogicoId: 'logico-1',
          }),
        }),
      );
      expect(result).toEqual([{ id: 'com-1' }]);
    });

    it('no filtra por artefactoLogicoId cuando no se especifica', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.findMany.mockResolvedValue([]);

      await service.findAll('proy-1', undefined, ownerUser);

      const callArg = prisma.comentario.findMany.mock.calls[0][0];
      expect(callArg.where).not.toHaveProperty('artefactoLogicoId');
    });

    it('filtra por técnica, por general o no filtra', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.findMany.mockResolvedValue([]);

      await service.findAll('proy-1', undefined, ownerUser, 'personas');
      expect(prisma.comentario.findMany.mock.calls[0][0].where).toHaveProperty('tecnica', 'personas');

      await service.findAll('proy-1', undefined, ownerUser, 'general');
      expect(prisma.comentario.findMany.mock.calls[1][0].where).toHaveProperty('tecnica', null);

      await service.findAll('proy-1', undefined, ownerUser);
      expect(prisma.comentario.findMany.mock.calls[2][0].where).not.toHaveProperty('tecnica');
    });

    it('lanza BadRequestException con una técnica inválida sin consultar', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(
        service.findAll('proy-1', undefined, ownerUser, 'otra'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.comentario.findMany).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si el usuario no tiene acceso al proyecto', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(
        service.findAll('proy-1', undefined, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const baseComment = {
      id: 'com-1',
      proyectoId: 'proy-1',
      autorId: ownerUser.id,
      texto: 'original',
      deletedAt: null as Date | null,
    };

    it('permite al autor editar su propio comentario', async () => {
      prisma.comentario.findUnique.mockResolvedValue(baseComment);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.update.mockResolvedValue({ ...baseComment, texto: 'editado' });

      const result = await service.update('com-1', { texto: 'editado' }, ownerUser);

      expect(prisma.comentario.update).toHaveBeenCalledWith({
        where: { id: 'com-1' },
        data: { texto: 'editado' },
      });
      expect(result.texto).toBe('editado');
    });

    it('permite a ADMIN editar un comentario ajeno', async () => {
      prisma.comentario.findUnique.mockResolvedValue(baseComment);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.update.mockResolvedValue({ ...baseComment, texto: 'editado' });

      await expect(
        service.update('com-1', { texto: 'editado' }, adminUser),
      ).resolves.toBeDefined();
    });

    it('lanza ForbiddenException si otro usuario (no autor ni ADMIN) intenta editar', async () => {
      prisma.comentario.findUnique.mockResolvedValue(baseComment);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(
        service.update('com-1', { texto: 'hackeado' }, otherUser),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.comentario.update).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el comentario no existe', async () => {
      prisma.comentario.findUnique.mockResolvedValue(null);

      await expect(
        service.update('com-x', { texto: 'x' }, ownerUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el comentario ya fue eliminado (soft delete)', async () => {
      prisma.comentario.findUnique.mockResolvedValue({
        ...baseComment,
        deletedAt: new Date(),
      });

      await expect(
        service.update('com-1', { texto: 'x' }, ownerUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    const baseComment = {
      id: 'com-1',
      proyectoId: 'proy-1',
      autorId: ownerUser.id,
      texto: 'x',
      deletedAt: null as Date | null,
    };

    it('el autor puede eliminar su propio comentario', async () => {
      prisma.comentario.findUnique.mockResolvedValue(baseComment);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.comentario.update.mockResolvedValue({ ...baseComment, deletedAt: new Date() });

      await service.softDelete('com-1', ownerUser);

      expect(prisma.comentario.update).toHaveBeenCalledWith({
        where: { id: 'com-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('lanza ForbiddenException si otro usuario (no autor ni ADMIN) intenta eliminar', async () => {
      prisma.comentario.findUnique.mockResolvedValue(baseComment);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(service.softDelete('com-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.comentario.update).not.toHaveBeenCalled();
    });
  });
});
