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
import { ProjectAccessService } from '../../../core/access/project-access.service';

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
    proyectoMiembro: { findUnique: jest.Mock };
    uxArtifact: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const adminUser: any = { id: 'user-admin', rol: 'ADMIN' };
  const ownerUser: any = { id: 'user-owner', rol: 'DOCENTE' };
  const otherUser: any = { id: 'user-other', rol: 'DOCENTE' };

  beforeEach(async () => {
    prisma = {
      proyecto: { findUnique: jest.fn() },
      proyectoMiembro: { findUnique: jest.fn() },
      uxArtifact: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtifactsService,
        ProjectAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
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
          where: expect.objectContaining({ proyectoId: 'proy-1', tipo: TipoArtefacto.PERSONA }),
        }),
      );
      expect(result).toEqual([{ id: 'a1' }]);
    });

    it('no filtra por tipo cuando no se especifica', async () => {
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findMany.mockResolvedValue([]);

      await service.findAll('proy-1', undefined, ownerUser);

      expect(prisma.uxArtifact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ proyectoId: 'proy-1' }) }),
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

  // Cierra B4/B9/B14: antes de estos tests, lockedById/lockedUntil se leían
  // en createVersion pero nada los escribía, así que el lock nunca se
  // activaba de verdad. acquireLock/releaseLock son el lado que faltaba.
  describe('softDelete', () => {
    const baseArtifact = {
      id: 'art-1',
      proyectoId: 'proy-1',
      tipo: TipoArtefacto.PERSONA,
      artefactoLogicoId: 'logico-1',
      version: 2,
      lockedById: null as string | null,
      lockedUntil: null as Date | null,
      deletedAt: null as Date | null,
    };

    it('marca deletedAt en todas las versiones del artefacto lógico', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.updateMany.mockResolvedValue({ count: 3 });

      await service.softDelete('art-1', ownerUser);

      expect(prisma.uxArtifact.updateMany).toHaveBeenCalledWith({
        where: { artefactoLogicoId: 'logico-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('lanza NotFoundException si el artefacto no existe', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(null);

      await expect(service.softDelete('art-1', ownerUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.uxArtifact.updateMany).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si el usuario no tiene acceso al proyecto', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(service.softDelete('art-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.uxArtifact.updateMany).not.toHaveBeenCalled();
    });

    it('RECHAZA eliminar si está bloqueado por otro usuario y el bloqueo sigue vigente', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue({
        ...baseArtifact,
        lockedById: otherUser.id,
        lockedUntil: new Date(Date.now() + 60_000),
      });
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(service.softDelete('art-1', ownerUser)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.uxArtifact.updateMany).not.toHaveBeenCalled();
    });

    it('permite eliminar si el bloqueo de otro usuario ya expiró', async () => {
      const lockedArtifact = {
        ...baseArtifact,
        lockedById: otherUser.id,
        lockedUntil: new Date(Date.now() - 60_000),
      };
      prisma.uxArtifact.findUnique.mockResolvedValue(lockedArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.updateMany.mockResolvedValue({ count: 1 });

      await service.softDelete('art-1', ownerUser);

      expect(prisma.uxArtifact.updateMany).toHaveBeenCalled();
    });

    it('permite eliminar si el propio usuario tiene el lock', async () => {
      const lockedArtifact = {
        ...baseArtifact,
        lockedById: ownerUser.id,
        lockedUntil: new Date(Date.now() + 60_000),
      };
      prisma.uxArtifact.findUnique.mockResolvedValue(lockedArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.updateMany.mockResolvedValue({ count: 1 });

      await service.softDelete('art-1', ownerUser);

      expect(prisma.uxArtifact.updateMany).toHaveBeenCalled();
    });

    it('es idempotente: eliminar un artefacto ya eliminado no falla', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue({
        ...baseArtifact,
        deletedAt: new Date(Date.now() - 3600_000),
      });
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.softDelete('art-1', ownerUser)).resolves.toBeDefined();
      expect(prisma.uxArtifact.updateMany).toHaveBeenCalled();
    });
  });

  describe('acquireLock', () => {
    const baseArtifact = {
      id: 'art-1',
      proyectoId: 'proy-1',
      tipo: TipoArtefacto.PERSONA,
      artefactoLogicoId: 'logico-1',
      version: 2,
      lockedById: null as string | null,
      lockedUntil: null as Date | null,
    };

    it('adquiere el lock cuando el artefacto está libre', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue(null);
      prisma.uxArtifact.update.mockResolvedValue({
        ...baseArtifact,
        lockedById: ownerUser.id,
      });

      const result = await service.acquireLock('art-1', ownerUser);

      expect(prisma.uxArtifact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'art-1' },
          data: expect.objectContaining({ lockedById: ownerUser.id }),
        }),
      );
      const callArg = prisma.uxArtifact.update.mock.calls[0][0];
      expect(callArg.data.lockedUntil).toBeInstanceOf(Date);
      expect(callArg.data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
      expect(result.lockedById).toBe(ownerUser.id);
    });

    it('RECHAZA adquirir el lock si otro usuario ya lo tiene vigente', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue({
        ...baseArtifact,
        lockedById: otherUser.id,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      await expect(service.acquireLock('art-1', ownerUser)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.uxArtifact.update).not.toHaveBeenCalled();
    });

    it('PERMITE adquirir el lock si el de otro usuario ya expiró', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue({
        ...baseArtifact,
        lockedById: otherUser.id,
        lockedUntil: new Date(Date.now() - 60_000),
      });
      prisma.uxArtifact.update.mockResolvedValue({
        ...baseArtifact,
        lockedById: ownerUser.id,
      });

      const result = await service.acquireLock('art-1', ownerUser);
      expect(result.lockedById).toBe(ownerUser.id);
    });

    it('renueva el TTL si el propio usuario ya tenía el lock', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue({
        ...baseArtifact,
        lockedById: ownerUser.id,
        lockedUntil: new Date(Date.now() + 5_000),
      });
      prisma.uxArtifact.update.mockResolvedValue({
        ...baseArtifact,
        lockedById: ownerUser.id,
      });

      await service.acquireLock('art-1', ownerUser);
      expect(prisma.uxArtifact.update).toHaveBeenCalled();
    });

    it('respeta un ttlSegundos custom dentro del tope máximo', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue(null);
      prisma.uxArtifact.update.mockResolvedValue(baseArtifact);

      await service.acquireLock('art-1', ownerUser, 10);

      const callArg = prisma.uxArtifact.update.mock.calls[0][0];
      const deltaMs = callArg.data.lockedUntil.getTime() - Date.now();
      expect(deltaMs).toBeGreaterThan(5_000);
      expect(deltaMs).toBeLessThanOrEqual(10_000);
    });

    it('un usuario sin acceso al proyecto no puede adquirir el lock', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(baseArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });

      await expect(service.acquireLock('art-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('releaseLock', () => {
    const lockedArtifact = {
      id: 'art-1',
      proyectoId: 'proy-1',
      tipo: TipoArtefacto.PERSONA,
      artefactoLogicoId: 'logico-1',
      version: 2,
      lockedById: 'user-owner',
      lockedUntil: new Date(Date.now() + 60_000),
    };

    it('el dueño del lock puede liberarlo', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(lockedArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue(lockedArtifact);
      prisma.uxArtifact.update.mockResolvedValue({
        ...lockedArtifact,
        lockedById: null,
        lockedUntil: null,
      });

      const result = await service.releaseLock('art-1', ownerUser);

      expect(prisma.uxArtifact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'art-1' },
          data: { lockedById: null, lockedUntil: null },
        }),
      );
      expect(result.lockedById).toBeNull();
    });

    it('RECHAZA liberar el lock de otro usuario si sigue vigente', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(lockedArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue(lockedArtifact);

      await expect(service.releaseLock('art-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.uxArtifact.update).not.toHaveBeenCalled();
    });

    it('ADMIN puede liberar el lock de cualquier usuario', async () => {
      prisma.uxArtifact.findUnique.mockResolvedValue(lockedArtifact);
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue(lockedArtifact);
      prisma.uxArtifact.update.mockResolvedValue({
        ...lockedArtifact,
        lockedById: null,
        lockedUntil: null,
      });

      const result = await service.releaseLock('art-1', adminUser);
      expect(result.lockedById).toBeNull();
    });

    it('liberar un lock ya expirado no falla aunque lo pida otro usuario con acceso al proyecto (ADMIN)', async () => {
      // "otherUser" (DOCENTE que no es dueño del proyecto) directamente no
      // pasaría ni el chequeo de acceso al proyecto (assertProjectAccess),
      // así que el escenario realista de "otro usuario libera un lock ya
      // expirado" es un ADMIN, que sí tiene acceso a cualquier proyecto.
      prisma.uxArtifact.findUnique.mockResolvedValue({
        ...lockedArtifact,
        lockedUntil: new Date(Date.now() - 60_000),
      });
      prisma.proyecto.findUnique.mockResolvedValue({ creadoPorId: ownerUser.id });
      prisma.uxArtifact.findFirst.mockResolvedValue({
        ...lockedArtifact,
        lockedUntil: new Date(Date.now() - 60_000),
      });
      prisma.uxArtifact.update.mockResolvedValue({
        ...lockedArtifact,
        lockedById: null,
        lockedUntil: null,
      });

      const result = await service.releaseLock('art-1', adminUser);
      expect(result.lockedById).toBeNull();
    });
  });
});