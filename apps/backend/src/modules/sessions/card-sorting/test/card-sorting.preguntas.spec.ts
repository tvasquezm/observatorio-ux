import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActorSesion, EstadoSesion, TipoSesion } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../core/database/prisma.service.js';
import { ProjectAccessService } from '../../../../core/access/project-access.service.js';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface.js';
import { CardSortingService } from '../card-sorting.service.js';
import {
  CreateCardSortingSessionDto,
  SubmitCardSortingResultDto,
} from '../dto/card-sorting.dto.js';
import { validarPreguntas } from '../card-sorting-input.js';

const UUID_A = '3f2b8f0e-5c1d-4e3a-9a77-2d6f4b1c9e10';
const UUID_B = '4a1c9d2e-6b7f-4c3d-8e51-7f2a3b4c5d6e';
const UUID_CARD = '5b2d0e3f-7c8a-4d4e-9f62-8a3b4c5d6e7f';

const pregunta = (n: number) => ({ texto: `Pregunta ${n}` });

describe('DTO · preguntas del evaluador', () => {
  const crear = (preguntas: unknown) =>
    validate(
      plainToInstance(CreateCardSortingSessionDto, {
        proyectoId: UUID_A,
        nombre: 'E',
        tarjetas: [{ etiqueta: 'A' }],
        preguntas,
      }),
    );

  it('acepta 0 y 5 preguntas; rechaza 6', async () => {
    expect(await crear(undefined)).toHaveLength(0);
    expect(await crear([])).toHaveLength(0);
    expect(await crear([1, 2, 3, 4, 5].map(pregunta))).toHaveLength(0);
    expect(await crear([1, 2, 3, 4, 5, 6].map(pregunta))).not.toHaveLength(0);
  });

  it('texto de pregunta: 300 ok, 301 rechazado', async () => {
    expect(await crear([{ texto: 'a'.repeat(300) }])).toHaveLength(0);
    expect(await crear([{ texto: 'a'.repeat(301) }])).not.toHaveLength(0);
  });

  const enviar = (respuestas: unknown) =>
    validate(
      plainToInstance(SubmitCardSortingResultDto, {
        grupos: [{ categoriaNombre: 'G', cardIds: [UUID_CARD] }],
        respuestas,
      }),
    );

  it('respuesta: 1000 ok, 1001 rechazada; questionId debe ser UUID; máx. 5', async () => {
    expect(await enviar([{ questionId: UUID_A, respuesta: 'a'.repeat(1000) }])).toHaveLength(0);
    expect(await enviar([{ questionId: UUID_A, respuesta: 'a'.repeat(1001) }])).not.toHaveLength(0);
    expect(await enviar([{ questionId: 'no-uuid', respuesta: 'x' }])).not.toHaveLength(0);
    const seis = Array.from({ length: 6 }, () => ({ questionId: UUID_A, respuesta: 'x' }));
    expect(await enviar(seis)).not.toHaveLength(0);
  });
});

describe('validarPreguntas', () => {
  it('rechaza preguntas que son solo espacios', () => {
    expect(() => validarPreguntas(['Ok', '   '])).toThrow('Las preguntas no pueden estar vacías.');
    expect(() => validarPreguntas(['Ok'])).not.toThrow();
    expect(() => validarPreguntas([])).not.toThrow();
  });
});

describe('CardSortingService.submitResult · respuestas', () => {
  const user = { id: 'p1', rol: 'PARTICIPANTE', actor: 'PARTICIPANTE' } as AuthenticatedUser;
  const grupos = [{ categoriaNombre: 'G', cardIds: ['card-1'] }];
  let tx: any;
  let service: CardSortingService;

  beforeEach(() => {
    tx = {
      researchSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1',
          tipo: TipoSesion.CARD_SORTING,
          actor: ActorSesion.PARTICIPANTE,
          estudioId: 'e1',
          participanteId: 'p1',
          estado: EstadoSesion.EN_PROGRESO,
        }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValueOnce({ id: 'e1', tipoCardSorting: 'ABIERTO', cerrado: false })
          .mockResolvedValue({ id: 's1' }),
        update: jest.fn(),
      },
      card: { findMany: jest.fn().mockResolvedValue([{ id: 'card-1' }]) },
      category: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'c1' }) },
      cardGrouping: { createMany: jest.fn() },
      cardSortingQuestion: { findMany: jest.fn().mockResolvedValue([{ id: UUID_A }]) },
      cardSortingAnswer: { createMany: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((cb: (t: unknown) => unknown) => cb(tx)) };
    service = new CardSortingService(
      prisma as unknown as PrismaService,
      { assertAccess: jest.fn() } as unknown as ProjectAccessService,
    );
  });

  it('questionId ajeno al estudio → 400 y no escribe nada', async () => {
    await expect(
      service.submitResult('s1', grupos, user, [{ questionId: UUID_B, respuesta: 'x' }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.cardGrouping.createMany).not.toHaveBeenCalled();
    expect(tx.cardSortingAnswer.createMany).not.toHaveBeenCalled();
    expect(tx.researchSession.update).not.toHaveBeenCalled();
  });

  it('misma pregunta dos veces → 400 y no escribe nada', async () => {
    await expect(
      service.submitResult('s1', grupos, user, [
        { questionId: UUID_A, respuesta: 'x' },
        { questionId: UUID_A, respuesta: 'y' },
      ]),
    ).rejects.toThrow('Una pregunta no puede responderse dos veces.');
    expect(tx.cardGrouping.createMany).not.toHaveBeenCalled();
  });

  it('guarda respuestas recortadas junto a las agrupaciones', async () => {
    await service.submitResult('s1', grupos, user, [{ questionId: UUID_A, respuesta: '  Me costó  ' }]);
    expect(tx.cardSortingAnswer.createMany).toHaveBeenCalledWith({
      data: [{ questionId: UUID_A, respuesta: 'Me costó', participanteSesionId: 's1' }],
    });
    expect(tx.cardGrouping.createMany).toHaveBeenCalledTimes(1);
  });

  it('respuesta en blanco se omite (pregunta opcional)', async () => {
    await service.submitResult('s1', grupos, user, [{ questionId: UUID_A, respuesta: '   ' }]);
    expect(tx.cardSortingAnswer.createMany).not.toHaveBeenCalled();
    expect(tx.researchSession.update).toHaveBeenCalled();
  });

  it('sin respuestas no consulta preguntas (compatibilidad)', async () => {
    await service.submitResult('s1', grupos, user);
    expect(tx.cardSortingQuestion.findMany).not.toHaveBeenCalled();
  });

  it('si falla createMany de respuestas, la promesa rechaza (la transacción revierte)', async () => {
    tx.cardSortingAnswer.createMany.mockRejectedValue(new Error('db'));
    await expect(
      service.submitResult('s1', grupos, user, [{ questionId: UUID_A, respuesta: 'x' }]),
    ).rejects.toThrow('db');
    expect(tx.researchSession.update).not.toHaveBeenCalled();
  });
});

describe('CardSortingService.getAnalytics · preguntas', () => {
  it('devuelve preguntas con respuestas anónimas (solo texto)', async () => {
    const prisma = {
      researchSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'e1', nombre: 'E', proyectoId: 'p', evaluadorId: 'ev', tipo: TipoSesion.CARD_SORTING,
          actor: ActorSesion.EVALUADOR, cerrado: false, createdAt: new Date(),
          cardsDefinidas: [{ id: 'c1', etiqueta: 'A' }],
          preguntas: [{ id: UUID_A, texto: '¿Qué costó?', orden: 0, respuestas: [{ respuesta: 'Nada' }] }],
          proyecto: null,
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      cardGrouping: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CardSortingService(
      prisma as unknown as PrismaService,
      { assertAccess: jest.fn() } as unknown as ProjectAccessService,
    );
    const res = await service.getAnalytics('e1', { id: 'ev', rol: 'ESTUDIANTE', actor: 'EVALUADOR' } as AuthenticatedUser);
    expect(res.preguntas).toEqual([{ id: UUID_A, texto: '¿Qué costó?', orden: 0, respuestas: ['Nada'] }]);
  });
});
