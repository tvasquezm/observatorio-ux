import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TipoArtefacto } from '@prisma/client';
import { ArtifactsService } from '../artifacts.service';
import { PrismaService } from '../../../core/database/prisma.service';

// Los schemas de Zod viven en un paquete compartido y validan la forma real
// de cada tipo de artefacto. Aquí se mockean para probar la LÓGICA del
// service (acceso, versionado, bloqueo) sin acoplarse a las reglas de
// negocio de cada schema, que deberían tener sus propios tests.
jest.mock('@observatorio-ux/shared-types', () => ({
  PersonaSchema: { parse: jest.fn() },
  JourneyMapSchema: { parse: jest.fn() },
  MomentosCriticosSchema: { parse: jest.fn() },
}));

import {
  PersonaSchema,
  JourneyMapSchema,
  MomentosCriticosSchema,
} from '@observatorio-ux/shared-types';

describe('ArtifactsService', () => {
  let service: ArtifactsService;
  let prisma: {
    proyecto: { findUnique: jest.Mock };
    uxArtifact: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  const adminUser: any = { id: 'user-admin', rol: 'ADMIN' };
  const ownerUser: any = { id: 'user-owner', rol: 'DOCENTE' };
  const otherUser: any = { id: 'user-other', rol: 'DOCENTE' };

  beforeEach(async () => {
    prisma = {
      proyecto: { findUnique: jest.fn() },
      uxArtifact: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ArtifactsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ArtifactsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('crea un artefacto PERSONA cuando el contenido es válido y el usuario tiene acceso', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (PersonaSchema.parse as jest.Mock).mockReturnValue(undefined);
      prisma.uxArtifact.create.mockResolvedValue({ id: 'art-1' });

      const dto = { tipo: TipoArtefacto.PERSONA, contenido: { nombre: 'Ana' } };
      const result = await service.create('proy-1', dto as any, ownerUser);

      expect(PersonaSchema.parse).toHaveBeenCalledWith(dto.contenido);
      expect(prisma.uxArtifact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            proyectoId: 'proy-1',
            tipo: TipoArtefacto.PERSONA,
            version: 1,
            autorId: ownerUser.id,
          }),
        }),
      );
      expect(result).toEqual({ id: 'art-1' });
    });

    it('genera un artefactoLogicoId automático si no se envía', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (PersonaSchema.parse as jest.Mock).mockReturnValue(undefined);
      prisma.uxArtifact.create.mockResolvedValue({ id: 'art-1' });

      await service.create(
        'proy-1',
        { tipo: TipoArtefacto.PERSONA, contenido: {} } as any,
        ownerUser,
      );

      const callArg = prisma.uxArtifact.create.mock.calls[0][0];
      expect(typeof callArg.data.artefactoLogicoId).toBe('string');
      expect(callArg.data.artefactoLogicoId.length).toBeGreaterThan(0);
    });

    it('lanza BadRequestException si el contenido de JOURNEY_MAP no cumple el schema', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (JourneyMapSchema.parse as jest.Mock).mockImplementation(() => {
        const { ZodError } = require('zod');
        throw new ZodError([{ path: ['etapas'], message: 'Requerido' } as any]);
      });

      await expect(
        service.create(
          'proy-1',
          { tipo: TipoArtefacto.JOURNEY_MAP, contenido: {} } as any,
          ownerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el contenido de MOMENTOS_CRITICOS no cumple el schema', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (MomentosCriticosSchema.parse as jest.Mock).mockImplementation(() => {
        const { ZodError } = require('zod');
        throw new ZodError([{ path: ['momento'], message: 'Requerido' } as any]);
      });

      await expect(
        service.create(
          'proy-1',
          { tipo: TipoArtefacto.MOMENTOS_CRITICOS, contenido: {} } as any,
          ownerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el proyecto no existe', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'proy-inexistente',
          { tipo: TipoArtefacto.PERSONA, contenido: {} } as any,
          ownerUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el usuario no es dueño ni ADMIN', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(
        service.create(
          'proy-1',
          { tipo: TipoArtefacto.PERSONA, contenido: {} } as any,
          otherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite crear a un ADMIN aunque no sea el dueño del proyecto', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (PersonaSchema.parse as jest.Mock).mockReturnValue(undefined);
      prisma.uxArtifact.create.mockResolvedValue({ id: 'art-2' });

      const result = await service.create(
        'proy-1',
        { tipo: TipoArtefacto.PERSONA, contenido: {} } as any,
        adminUser,
      );

      expect(result).toEqual({ id: 'art-2' });
    });
  });

  describe('findAll', () => {
    it('filtra por tipo cuando se especifica', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findMany.mockResolvedValue([{ id: 'a1' }]);

      const result = await service.findAll('proy-1', TipoArtefacto.PERSONA, ownerUser);

      expect(prisma.uxArtifact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { proyectoId: 'proy-1', tipo: TipoArtefacto.PERSONA },
        }),
      );
      expect(result).toEqual([{ id: 'a1' }]);
    });

    it('no filtra por tipo cuando no se especifica', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findMany.mockResolvedValue([]);

      await service.findAll('proy-1', undefined, ownerUser);

      expect(prisma.uxArtifact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { proyectoId: 'proy-1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el artefacto no existe', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(null);

      await expect(service.findOne('art-x', ownerUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('valida acceso al proyecto del artefacto encontrado', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue({
        id: 'art-1',
        proyectoId: 'proy-1',
      });
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      const result = await service.findOne('art-1', ownerUser);
      expect(result).toEqual({ id: 'art-1', proyectoId: 'proy-1' });
    });
  });

  describe('createVersion', () => {
    const baseArtifact = {
      id: 'art-1',
      proyectoId: 'proy-1',
      tipo: TipoArtefacto.PERSONA,
      artefactoLogicoId: 'logico-1',
      version: 2,
      lockedById: null as string | null,
      lockedUntil: null as Date | null,
    };

    it('crea la siguiente versión heredando el tipo del artefacto existente', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (PersonaSchema.parse as jest.Mock).mockReturnValue(undefined);
      prisma.uxArtifact.findFirst.mockResolvedValue({ version: 3 });
      prisma.uxArtifact.create.mockResolvedValue({ id: 'art-1', version: 4 });

      const result = await service.createVersion(
        'art-1',
        { contenido: { nombre: 'Ana v2' } },
        ownerUser,
      );

      expect(prisma.uxArtifact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 4,
            tipo: TipoArtefacto.PERSONA,
            artefactoLogicoId: 'logico-1',
          }),
        }),
      );
      expect(result).toEqual({ id: 'art-1', version: 4 });
    });

    it('lanza ConflictException si está bloqueado por otro usuario y el bloqueo sigue vigente', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue({
        ...baseArtifact,
        lockedById: otherUser.id,
        lockedUntil: new Date(Date.now() + 60_000),
      });
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(
        service.createVersion('art-1', { contenido: {} }, ownerUser),
      ).rejects.toThrow(ConflictException);
    });

    it('permite crear versión si el bloqueo de otro usuario ya expiró', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue({
        ...baseArtifact,
        lockedById: otherUser.id,
        lockedUntil: new Date(Date.now() - 60_000),
      });
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (PersonaSchema.parse as jest.Mock).mockReturnValue(undefined);
      prisma.uxArtifact.findFirst.mockResolvedValue(null);
      prisma.uxArtifact.create.mockResolvedValue({ id: 'art-1', version: 3 });

      const result = await service.createVersion('art-1', { contenido: {} }, ownerUser);

      expect(result).toEqual({ id: 'art-1', version: 3 });
    });

    it('permite crear versión si el propio usuario tiene el bloqueo', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue({
        ...baseArtifact,
        lockedById: ownerUser.id,
        lockedUntil: new Date(Date.now() + 60_000),
      });
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      (PersonaSchema.parse as jest.Mock).mockReturnValue(undefined);
      prisma.uxArtifact.findFirst.mockResolvedValue(null);
      prisma.uxArtifact.create.mockResolvedValue({ id: 'art-1', version: 3 });

      const result = await service.createVersion('art-1', { contenido: {} }, ownerUser);

      expect(result).toEqual({ id: 'art-1', version: 3 });
    });
  });
});