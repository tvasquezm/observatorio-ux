// Pruebas unitarias — ProjectsService. Cubre A8 del backlog: ownership
// (un usuario no puede ver/editar el proyecto de otro, salvo ADMIN) y
// el CRUD básico (incluye el PATCH agregado para cerrar A6).

import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../projects.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: {
    proyecto: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const DUEÑO_ID = 'usuario-dueño';
  const OTRO_ID = 'usuario-intruso';
  const PROYECTO_ID = 'proyecto-123';

  const proyectoDeEjemplo = {
    id: PROYECTO_ID,
    nombre: 'Observatorio UX',
    creadoPorId: DUEÑO_ID,
  };

  const userDueño: AuthenticatedUser = { id: DUEÑO_ID, rol: 'DOCENTE' } as AuthenticatedUser;
  const userIntruso: AuthenticatedUser = { id: OTRO_ID, rol: 'ESTUDIANTE' } as AuthenticatedUser;
  const userAdmin: AuthenticatedUser = { id: 'admin-1', rol: 'ADMIN' } as AuthenticatedUser;

  beforeEach(async () => {
    prisma = {
      proyecto: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ProjectsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  describe('create', () => {
    it('crea el proyecto asignando creadoPorId al usuario autenticado', async () => {
      prisma.proyecto.create.mockResolvedValue(proyectoDeEjemplo);

      await service.create(userDueño, { nombre: 'Observatorio UX' } as any);

      expect(prisma.proyecto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ creadoPorId: DUEÑO_ID }),
      });
    });
  });

  describe('findAll', () => {
    it('un usuario normal solo ve SUS proyectos (filtra por creadoPorId)', async () => {
      prisma.proyecto.findMany.mockResolvedValue([proyectoDeEjemplo]);

      await service.findAll(userDueño);

      expect(prisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { creadoPorId: DUEÑO_ID } }),
      );
    });

    it('ADMIN ve todos los proyectos (sin filtro where)', async () => {
      prisma.proyecto.findMany.mockResolvedValue([proyectoDeEjemplo]);

      await service.findAll(userAdmin);

      expect(prisma.proyecto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('findOne (ownership)', () => {
    it('el dueño puede ver su proyecto', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(proyectoDeEjemplo);

      await expect(service.findOne(PROYECTO_ID, userDueño)).resolves.toEqual(
        proyectoDeEjemplo,
      );
    });

    it('RECHAZA a un usuario que no es dueño del proyecto', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(proyectoDeEjemplo);

      await expect(service.findOne(PROYECTO_ID, userIntruso)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('ADMIN puede ver el proyecto de cualquier usuario', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(proyectoDeEjemplo);

      await expect(service.findOne(PROYECTO_ID, userAdmin)).resolves.toEqual(
        proyectoDeEjemplo,
      );
    });

    it('devuelve 404 si el proyecto no existe', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(null);

      await expect(service.findOne('no-existe', userDueño)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update (PATCH /proyectos/:id)', () => {
    it('el dueño puede editar su proyecto', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(proyectoDeEjemplo);
      prisma.proyecto.update.mockResolvedValue({
        ...proyectoDeEjemplo,
        nombre: 'Nuevo nombre',
      });

      const result = await service.update(
        PROYECTO_ID,
        { nombre: 'Nuevo nombre' },
        userDueño,
      );

      expect(result.nombre).toBe('Nuevo nombre');
      expect(prisma.proyecto.update).toHaveBeenCalledWith({
        where: { id: PROYECTO_ID },
        data: { nombre: 'Nuevo nombre' },
      });
    });

    it('RECHAZA la edición si el usuario no es dueño (reusa el ownership de findOne)', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(proyectoDeEjemplo);

      await expect(
        service.update(PROYECTO_ID, { nombre: 'Hackeado' }, userIntruso),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.proyecto.update).not.toHaveBeenCalled();
    });

    it('ADMIN puede editar el proyecto de cualquier usuario', async () => {
      prisma.proyecto.findUnique.mockResolvedValue(proyectoDeEjemplo);
      prisma.proyecto.update.mockResolvedValue({
        ...proyectoDeEjemplo,
        descripcion: 'Actualizado por admin',
      });

      const result = await service.update(
        PROYECTO_ID,
        { descripcion: 'Actualizado por admin' },
        userAdmin,
      );

      expect(result.descripcion).toBe('Actualizado por admin');
    });
  });
});