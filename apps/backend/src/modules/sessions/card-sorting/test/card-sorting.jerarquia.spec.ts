import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActorSesion, EstadoSesion, TipoSesion } from '@prisma/client';
import { CardSortingService, Grupo } from '../card-sorting.service.js';
import { SubmitCardSortingResultDto } from '../dto/card-sorting.dto.js';
import { PrismaService } from '../../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface.js';

const UUID_CARD = '5b2d0e3f-7c8a-4d4e-9f62-8a3b4c5d6e7f';

describe('DTO · categoriaPadre', () => {
  const enviar = (categoriaPadre: unknown) =>
    validate(
      plainToInstance(SubmitCardSortingResultDto, {
        grupos: [{ categoriaNombre: 'Sub', categoriaPadre, cardIds: [UUID_CARD] }],
      }),
    );

  it('acepta ausente y 60 caracteres; rechaza vacío y 61', async () => {
    expect(await enviar(undefined)).toHaveLength(0);
    expect(await enviar('a'.repeat(60))).toHaveLength(0);
    expect(await enviar('')).not.toHaveLength(0);
    expect(await enviar('a'.repeat(61))).not.toHaveLength(0);
  });
});

describe('DTO · nombres de categorías propias', () => {
  it.each([60, 61])('aplica el límite al nombre de %i caracteres antes de persistirlo', async (length) => {
    const dto = plainToInstance(SubmitCardSortingResultDto, {
      grupos: [{ categoriaNombre: 'a'.repeat(length), cardIds: [UUID_CARD] }],
    });
    const errors = await validate(dto);
    expect(errors.length > 0).toBe(length > 60);
  });
});

describe('CardSortingService.submitResult · jerarquía de 2 niveles', () => {
  let service: CardSortingService;
  let tx: {
    researchSession: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; update: jest.Mock };
    card: { findMany: jest.Mock };
    category: { findMany: jest.Mock; create: jest.Mock };
    cardGrouping: { createMany: jest.Mock };
    cardSortingQuestion: { findMany: jest.Mock };
    cardSortingAnswer: { createMany: jest.Mock };
  };

  const USER = { id: 'part-1', rol: 'PARTICIPANTE', actor: 'PARTICIPANTE' } as AuthenticatedUser;
  const SESION = {
    id: 'sesion-1',
    tipo: TipoSesion.CARD_SORTING,
    actor: ActorSesion.PARTICIPANTE,
    estudioId: 'estudio-1',
    participanteId: USER.id,
    estado: EstadoSesion.EN_PROGRESO,
  };

  beforeEach(async () => {
    let n = 0;
    tx = {
      researchSession: {
        findUnique: jest.fn().mockResolvedValue(SESION),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      card: { findMany: jest.fn() },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(({ data }: { data: object }) =>
          Promise.resolve({ id: `cat-${++n}`, ...data }),
        ),
      },
      cardGrouping: { createMany: jest.fn() },
      cardSortingQuestion: { findMany: jest.fn() },
      cardSortingAnswer: { createMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CardSortingService,
        {
          provide: PrismaService,
          useValue: { $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)) },
        },
        { provide: ProjectAccessService, useValue: { assertAccess: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(CardSortingService);
  });

  const enviar = (tipo: string, grupos: Grupo[], cards = ['c1', 'c2']) => {
    tx.card.findMany.mockResolvedValue(cards.map((id) => ({ id })));
    tx.researchSession.findUniqueOrThrow
      .mockReset()
      .mockResolvedValueOnce({ id: 'estudio-1', tipoCardSorting: tipo, cerrado: false })
      .mockResolvedValueOnce({ ...SESION, estado: EstadoSesion.COMPLETADO });
    return service.submitResult(SESION.id, grupos, USER);
  };

  const sinEscribir = () => {
    expect(tx.cardGrouping.createMany).not.toHaveBeenCalled();
    expect(tx.researchSession.update).not.toHaveBeenCalled();
  };

  it('crea el padre y la subcategoría con parentId y asigna la tarjeta a la subcategoría', async () => {
    await enviar('ABIERTO', [
      { categoriaNombre: 'Biblioteca', categoriaPadre: 'Servicios', cardIds: ['c1'] },
      { categoriaNombre: 'Otros', cardIds: ['c2'] },
    ]);

    const creadas = tx.category.create.mock.calls.map((c) => c[0].data);
    expect(creadas[0]).toMatchObject({ nombre: 'Servicios', esPredefinida: false });
    expect(creadas[0].parentId).toBeUndefined();
    expect(creadas[1]).toMatchObject({ nombre: 'Biblioteca', parentId: 'cat-1' });
    expect(tx.cardGrouping.createMany.mock.calls[0][0].data).toEqual([
      { cardId: 'c1', categoryId: 'cat-2', participanteSesionId: SESION.id },
      { cardId: 'c2', categoryId: 'cat-3', participanteSesionId: SESION.id },
    ]);
  });

  it.each([
    ['padre antes', ['Servicios', 'Biblioteca']],
    ['hijo antes', ['Biblioteca', 'Servicios']],
  ])('el padre con tarjetas propias se reutiliza (%s): una sola fila', async (_t, orden) => {
    const hijo: Grupo = { categoriaNombre: 'Biblioteca', categoriaPadre: 'servicios', cardIds: ['c1'] };
    const padre: Grupo = { categoriaNombre: 'Servicios', cardIds: ['c2'] };
    await enviar('HIBRIDO', orden[0] === 'Servicios' ? [padre, hijo] : [hijo, padre]);

    const nombres = tx.category.create.mock.calls.map((c) => c[0].data.nombre);
    expect(nombres.filter((x: string) => x.toLowerCase() === 'servicios')).toHaveLength(1);
    expect(nombres).toHaveLength(2);
  });

  it('el padre se compara sin tildes ni mayúsculas', async () => {
    await enviar('ABIERTO', [
      { categoriaNombre: 'A', categoriaPadre: 'Menú', cardIds: ['c1'] },
      { categoriaNombre: 'B', categoriaPadre: 'menu', cardIds: ['c2'] },
    ]);
    const padres = tx.category.create.mock.calls
      .map((c) => c[0].data)
      .filter((d: { parentId?: string }) => d.parentId === undefined);
    expect(padres).toHaveLength(1);
  });

  it('RECHAZA 3 niveles (B hija de A, C hija de B)', async () => {
    await expect(
      enviar('ABIERTO', [
        { categoriaNombre: 'B', categoriaPadre: 'A', cardIds: ['c1'] },
        { categoriaNombre: 'C', categoriaPadre: 'B', cardIds: ['c2'] },
      ]),
    ).rejects.toThrow('Solo se permiten 2 niveles');
    sinEscribir();
  });

  it('RECHAZA 3 niveles aunque lleguen en orden inverso', async () => {
    await expect(
      enviar('ABIERTO', [
        { categoriaNombre: 'C', categoriaPadre: 'B', cardIds: ['c1'] },
        { categoriaNombre: 'B', categoriaPadre: 'A', cardIds: ['c2'] },
      ]),
    ).rejects.toThrow('dos jerarquías distintas');
    sinEscribir();
  });

  it('RECHAZA la misma subcategoría bajo dos padres distintos', async () => {
    await expect(
      enviar('ABIERTO', [
        { categoriaNombre: 'S', categoriaPadre: 'A', cardIds: ['c1'] },
        { categoriaNombre: 'S', categoriaPadre: 'B', cardIds: ['c2'] },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    sinEscribir();
  });

  it('RECHAZA una categoría como su propio padre', async () => {
    await expect(
      enviar('ABIERTO', [
        { categoriaNombre: 'Menú', categoriaPadre: ' menu ', cardIds: ['c1', 'c2'] },
      ]),
    ).rejects.toThrow('propia categoría padre');
    sinEscribir();
  });

  it('RECHAZA categoriaPadre en un estudio CERRADO', async () => {
    await expect(
      enviar('CERRADO', [
        { categoriaNombre: 'S', categoriaPadre: 'A', cardIds: ['c1', 'c2'] },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    sinEscribir();
    expect(tx.category.create).not.toHaveBeenCalled();
  });

  it('RECHAZA categoriaPadre junto a categoriaId o sin categoriaNombre', async () => {
    await expect(
      enviar('ABIERTO', [{ categoriaId: 'cat-x', categoriaPadre: 'A', cardIds: ['c1', 'c2'] }]),
    ).rejects.toThrow('solo puede usarse junto con categoriaNombre');
    await expect(
      enviar('ABIERTO', [{ categoriaPadre: 'A', cardIds: ['c1', 'c2'] }]),
    ).rejects.toThrow('solo puede usarse junto con categoriaNombre');
  });

  it('RECHAZA un padre en blanco', async () => {
    await expect(
      enviar('ABIERTO', [{ categoriaNombre: 'S', categoriaPadre: '   ', cardIds: ['c1', 'c2'] }]),
    ).rejects.toThrow('no puede estar vacía');
  });

  it('RECHAZA colgar una subcategoría de una categoría predefinida (híbrido)', async () => {
    tx.category.findMany.mockResolvedValue([{ nombre: 'Predefinida' }]);
    await expect(
      enviar('HIBRIDO', [
        { categoriaNombre: 'S', categoriaPadre: 'predefinída', cardIds: ['c1', 'c2'] },
      ]),
    ).rejects.toThrow('solo pueden colgar de categorías propias');
    expect(tx.category.findMany).toHaveBeenCalledWith({
      where: { sessionId: 'estudio-1', esPredefinida: true },
      select: { nombre: true },
    });
    sinEscribir();
  });

  it('sin categoriaPadre no consulta predefinidas (comportamiento anterior intacto)', async () => {
    await enviar('ABIERTO', [{ categoriaNombre: 'G', cardIds: ['c1', 'c2'] }]);
    expect(tx.category.findMany).not.toHaveBeenCalled();
    expect(tx.category.create.mock.calls[0][0].data.parentId).toBeNull();
  });
});

describe('CardSortingService.getAnalytics · nivel 1 con subcategorías', () => {
  const user = { id: 'evaluador-1', rol: 'ESTUDIANTE', actor: 'EVALUADOR' } as AuthenticatedUser;

  function crear(groupings: unknown[]) {
    const prisma = {
      researchSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'estudio-1',
          nombre: 'E',
          proyectoId: 'proyecto-1',
          evaluadorId: user.id,
          tipo: TipoSesion.CARD_SORTING,
          actor: ActorSesion.EVALUADOR,
          cerrado: false,
          createdAt: new Date('2026-10-04T12:00:00Z'),
          cardsDefinidas: [
            { id: 'card-1', etiqueta: 'Biblioteca' },
            { id: 'card-2', etiqueta: 'Calendario' },
          ],
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]),
      },
      cardGrouping: { findMany: jest.fn().mockResolvedValue(groupings) },
    };
    const service = new CardSortingService(
      prisma as unknown as PrismaService,
      { assertAccess: jest.fn() } as unknown as ProjectAccessService,
    );
    return { prisma, service };
  }

  const g = (p: string, card: string, categoria: object) => ({
    participanteSesionId: p,
    cardId: card,
    card: { id: card },
    category: categoria,
  });
  const padre = { id: 'padre-1', nombre: 'Servicios', parentId: null, parent: null };
  const subA = { id: 'sub-a', nombre: 'Consulta', parentId: 'padre-1', parent: padre };
  const subB = { id: 'sub-b', nombre: 'Agenda', parentId: 'padre-1', parent: padre };
  const plana = { id: 'otra', nombre: ' servicios ', parentId: null, parent: null };

  it('subcategorías distintas bajo el mismo padre cuentan como juntas y agregan con el nivel 1 de otro participante', async () => {
    const { prisma, service } = crear([
      g('p-1', 'card-1', subA),
      g('p-1', 'card-2', subB),
      g('p-2', 'card-1', plana),
      g('p-2', 'card-2', plana),
    ]);

    const r = await service.getAnalytics('estudio-1', user);

    expect(prisma.cardGrouping.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { card: true, category: { include: { parent: true } } } }),
    );
    expect(r.matrizSimilitud[0][1]).toBe(100);
    expect(r.categorias).toEqual(['Servicios']);
    expect(r.frecuenciaPorCategoria).toEqual([{ nombre: 'Servicios', count: 4, porcentaje: 100 }]);
    expect(r.clusters[0]).toMatchObject({ nombre: 'Servicios', acuerdo: 100 });
    expect(r.participantes[0].grupos).toEqual([
      { categoria: 'Servicios', tarjetas: ['Biblioteca', 'Calendario'] },
    ]);
  });

  it('porCategoria[].subcategorias lista el detalle por subcategoría; vacío si no hay', async () => {
    const { service } = crear([
      g('p-1', 'card-1', subA),
      g('p-1', 'card-2', subB),
      g('p-2', 'card-1', plana),
      g('p-2', 'card-2', plana),
    ]);

    const r = await service.getAnalytics('estudio-1', user);

    expect(r.porCategoria).toHaveLength(1);
    expect(r.porCategoria[0].subcategorias).toEqual([
      { nombre: 'Agenda', cartas: [{ tarjeta: 'Calendario', frecuencia: 1 }] },
      { nombre: 'Consulta', cartas: [{ tarjeta: 'Biblioteca', frecuencia: 1 }] },
    ]);
    expect(r.porCategoria[0].cartas).toEqual(
      expect.arrayContaining([
        { tarjeta: 'Biblioteca', frecuencia: 2 },
        { tarjeta: 'Calendario', frecuencia: 2 },
      ]),
    );

    const sin = await crear([g('p-1', 'card-1', plana), g('p-1', 'card-2', plana)]).service.getAnalytics(
      'estudio-1',
      user,
    );
    expect(sin.porCategoria[0].subcategorias).toEqual([]);
  });
});
