// Pruebas unitarias — protección IDOR en Card Sorting.
// submitResult() es la operación más delicada del módulo (transacción +
// validación de pertenencia). Estas pruebas fijan el comportamiento de
// seguridad: un participante NUNCA puede enviar resultados a nombre de
// la sesión de otro participante.

import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActorSesion, EstadoSesion, TipoSesion } from '@prisma/client';
import { CardSortingService } from '../card-sorting.service';
import { PrismaService } from '../../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface';

describe('CardSortingService.submitResult', () => {
  let service: CardSortingService;
  let tx: {
    researchSession: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    card: { findMany: jest.Mock };
    category: { findUnique: jest.Mock; create: jest.Mock };
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
      category: { findUnique: jest.fn(), create: jest.fn() },
      cardGrouping: { createMany: jest.fn() },
    };

    const prisma = {
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CardSortingService,
        { provide: PrismaService, useValue: prisma },
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
});