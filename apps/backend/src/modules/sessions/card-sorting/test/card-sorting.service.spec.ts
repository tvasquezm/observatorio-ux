// Pruebas unitarias — protección IDOR en Card Sorting.
// submitResult() es la operación más delicada del módulo (transacción +
// validación de pertenencia). Estas pruebas fijan el comportamiento de
// seguridad: un participante NUNCA puede enviar resultados a nombre de
// la sesión de otro participante.

import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActorSesion, EstadoSesion, TipoSesion } from '@prisma/client';
import { CardSortingService } from '../card-sorting.service.js';
import { PrismaService } from '../../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface.js';

describe('CardSortingService.submitResult', () => {
  let service: CardSortingService;
  let tx: {
    researchSession: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    card: { findMany: jest.Mock };
    category: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    cardGrouping: { createMany: jest.Mock };
  };

  const PARTICIPANTE_DUEÑO = 'participante-dueño';
  const PARTICIPANTE_INTRUSO = 'participante-intruso';
  const SESION_ID = 'sesion-participante-1';

  const sesionDeEjemplo = {
    id: SESION_ID,
    tipo: TipoSesion.CARD_SORTING,
    actor: ActorSesion.PARTICIPANTE,
    estudioId: 'estudio-1',
    participanteId: PARTICIPANTE_DUEÑO,
    estado: EstadoSesion.EN_PROGRESO,
  };

  const userDueño: AuthenticatedUser = {
    id: PARTICIPANTE_DUEÑO,
    rol: 'PARTICIPANTE',
    actor: 'PARTICIPANTE',
  } as AuthenticatedUser;

  const userIntruso: AuthenticatedUser = {
    id: PARTICIPANTE_INTRUSO,
    rol: 'PARTICIPANTE',
    actor: 'PARTICIPANTE',
  } as AuthenticatedUser;

  beforeEach(async () => {
    tx = {
      researchSession: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      card: { findMany: jest.fn() },
      category: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      cardGrouping: { createMany: jest.fn() },
    };

    const prisma = {
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CardSortingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectAccessService, useValue: { assertAccess: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(CardSortingService);
  });

  it('RECHAZA cuando el usuario autenticado no es el dueño de la sesión de participante (IDOR)', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);

    await expect(
      service.submitResult(SESION_ID, [{ categoriaNombre: 'Grupo 1', cardIds: ['c1'] }], userIntruso),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.cardGrouping.createMany).not.toHaveBeenCalled();
    expect(tx.researchSession.update).not.toHaveBeenCalled();
  });

  it('RECHAZA si la sesión ya fue completada (no se puede reenviar)', async () => {
    tx.researchSession.findUnique.mockResolvedValue({
      ...sesionDeEjemplo,
      estado: EstadoSesion.COMPLETADO,
    });

    await expect(
      service.submitResult(SESION_ID, [{ categoriaNombre: 'Grupo 1', cardIds: ['c1'] }], userDueño),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve 404 si la sesión de participante no existe', async () => {
    tx.researchSession.findUnique.mockResolvedValue(null);

    await expect(
      service.submitResult('no-existe', [], userDueño),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('RECHAZA si una tarjeta enviada no pertenece al estudio', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
    tx.researchSession.findUniqueOrThrow.mockResolvedValue({
      id: 'estudio-1',
      tipoCardSorting: 'ABIERTO',
    });
    tx.card.findMany.mockResolvedValue([{ id: 'card-real' }]);
    tx.category.create.mockResolvedValue({ id: 'categoria-1' });

    await expect(
      service.submitResult(
        SESION_ID,
        [{ categoriaNombre: 'Grupo 1', cardIds: ['card-que-no-existe'] }],
        userDueño,
      ),
    ).rejects.toThrow('Una tarjeta no pertenece a este estudio.');
  });

  it('el dueño legítimo SÍ puede enviar sus resultados correctamente', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
    tx.card.findMany.mockResolvedValue([{ id: 'card-1' }]);
    tx.researchSession.update.mockResolvedValue(undefined);
    tx.category.create.mockResolvedValue({ id: 'categoria-1' });

    const finalSession = { ...sesionDeEjemplo, estado: EstadoSesion.COMPLETADO };
    tx.researchSession.findUniqueOrThrow
      .mockReset()
      .mockResolvedValueOnce({ id: 'estudio-1', tipoCardSorting: 'ABIERTO' })
      .mockResolvedValueOnce(finalSession);

    const result = await service.submitResult(
      SESION_ID,
      [{ categoriaNombre: 'Grupo 1', cardIds: ['card-1'] }],
      userDueño,
    );

    expect(tx.cardGrouping.createMany).toHaveBeenCalledTimes(1);
    expect(result.estado).toBe(EstadoSesion.COMPLETADO);
  });

  it('con categoriaId trae las categorías en un solo findMany por lote (sin N+1)', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
    tx.card.findMany.mockResolvedValue([{ id: 'card-1' }, { id: 'card-2' }]);
    tx.researchSession.update.mockResolvedValue(undefined);
    tx.category.findMany.mockResolvedValue([
      { id: 'cat-a', sessionId: 'estudio-1', esPredefinida: true },
      { id: 'cat-b', sessionId: 'estudio-1', esPredefinida: true },
    ]);

    const finalSession = { ...sesionDeEjemplo, estado: EstadoSesion.COMPLETADO };
    tx.researchSession.findUniqueOrThrow
      .mockReset()
      .mockResolvedValueOnce({ id: 'estudio-1', tipoCardSorting: 'CERRADO' })
      .mockResolvedValueOnce(finalSession);

    const result = await service.submitResult(
      SESION_ID,
      [
        { categoriaId: 'cat-a', cardIds: ['card-1'] },
        { categoriaId: 'cat-b', cardIds: ['card-2'] },
      ],
      userDueño,
    );

    expect(tx.category.findMany).toHaveBeenCalledTimes(1);
    expect(tx.category.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['cat-a', 'cat-b'] } },
    });
    expect(tx.category.findUnique).not.toHaveBeenCalled();
    expect(tx.cardGrouping.createMany).toHaveBeenCalledTimes(1);
    expect(result.estado).toBe(EstadoSesion.COMPLETADO);
  });

  it('RECHAZA si categoriaId no pertenece al estudio (misma validación tras el batch fetch)', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
    tx.card.findMany.mockResolvedValue([{ id: 'card-1' }]);
    tx.category.findMany.mockResolvedValue([
      { id: 'cat-otro-estudio', sessionId: 'otro-estudio' },
    ]);
    tx.researchSession.findUniqueOrThrow.mockResolvedValue({
      id: 'estudio-1',
      tipoCardSorting: 'CERRADO',
    });

    await expect(
      service.submitResult(
        SESION_ID,
        [{ categoriaId: 'cat-otro-estudio', cardIds: ['card-1'] }],
        userDueño,
      ),
    ).rejects.toThrow('La categoría no pertenece a este estudio.');
  });

  it('HIBRIDO permite mezclar categoría predefinida y categoría nueva', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
    tx.card.findMany.mockResolvedValue([{ id: 'card-1' }, { id: 'card-2' }]);
    tx.category.findMany.mockResolvedValue([{ id: 'cat-1', sessionId: 'estudio-1', esPredefinida: true }]);
    tx.category.create.mockResolvedValue({ id: 'cat-nueva' });
    tx.researchSession.update.mockResolvedValue(undefined);
    tx.researchSession.findUniqueOrThrow
      .mockReset()
      .mockResolvedValueOnce({ id: 'estudio-1', tipoCardSorting: 'HIBRIDO' })
      .mockResolvedValueOnce({ ...sesionDeEjemplo, estado: EstadoSesion.COMPLETADO });

    await service.submitResult(
      SESION_ID,
      [
        { categoriaId: 'cat-1', cardIds: ['card-1'] },
        { categoriaNombre: 'Mi categoría', cardIds: ['card-2'] },
      ],
      userDueño,
    );

    expect(tx.category.create).toHaveBeenCalledTimes(1);
    expect(tx.cardGrouping.createMany).toHaveBeenCalledTimes(1);
  });

  it('rechaza usar por id una categoría creada por otro participante del mismo estudio', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
    tx.researchSession.findUniqueOrThrow.mockResolvedValue({ id: 'estudio-1', tipoCardSorting: 'HIBRIDO' });
    tx.card.findMany.mockResolvedValue([{ id: 'card-1' }]);
    tx.category.findMany.mockResolvedValue([{ id: 'cat-ajena', sessionId: 'estudio-1', esPredefinida: false }]);
    await expect(service.submitResult(SESION_ID, [{ categoriaId: 'cat-ajena', cardIds: ['card-1'] }], userDueño))
      .rejects.toThrow('Solo se pueden usar categorías predefinidas por id.');
    expect(tx.cardGrouping.createMany).not.toHaveBeenCalled();
    expect(tx.researchSession.update).not.toHaveBeenCalled();
  });

  it('CERRADO sigue rechazando categorías nuevas', async () => {
    tx.researchSession.findUnique.mockResolvedValue(sesionDeEjemplo);
    tx.card.findMany.mockResolvedValue([{ id: 'card-1' }]);
    tx.researchSession.findUniqueOrThrow
      .mockReset()
      .mockResolvedValueOnce({ id: 'estudio-1', tipoCardSorting: 'CERRADO' });

    await expect(
      service.submitResult(SESION_ID, [{ categoriaNombre: 'Nueva', cardIds: ['card-1'] }], userDueño),
    ).rejects.toThrow('Solo los estudios abiertos o híbridos permiten crear categorías nuevas.');
    expect(tx.category.create).not.toHaveBeenCalled();
  });
});


describe('CardSortingService.getSession · categorías híbridas', () => {
  it('otro participante recibe solo categorías predefinidas, sin los grupos de respuestas anteriores', async () => {
    const predefined = { id: 'predefinida', nombre: 'Servicios', esPredefinida: true };
    const previous = { id: 'ajena', nombre: 'Mi grupo', esPredefinida: false };
    const findUnique = jest.fn(async ({ include }: { include: { estudio: { include: { categoriasDefinidas: { where?: { esPredefinida?: boolean } } } } } }) => ({
      id: 'sesion-2', tipo: TipoSesion.CARD_SORTING, actor: ActorSesion.PARTICIPANTE,
      participanteId: 'participante-2', estudio: {
        id: 'estudio-1', tipoCardSorting: 'HIBRIDO',
        categoriasDefinidas: include.estudio.include.categoriasDefinidas.where?.esPredefinida
          ? [predefined] : [predefined, previous],
      },
    }));
    const service = new CardSortingService(
      { researchSession: { findUnique } } as unknown as PrismaService,
      {} as ProjectAccessService,
    );
    const session = await service.getSession('sesion-2', { id: 'participante-2', actor: 'PARTICIPANTE' } as AuthenticatedUser);
    expect(session.estudio?.categoriasDefinidas.map((category) => category.id)).toEqual(['predefinida']);
  });
});
