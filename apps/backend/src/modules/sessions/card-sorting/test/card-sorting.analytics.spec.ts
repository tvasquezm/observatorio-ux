import { ActorSesion, EstadoSesion, TipoSesion } from '@prisma/client';
import { PrismaService } from '../../../../core/database/prisma.service';
import { ProjectAccessService } from '../../../../core/access/project-access.service';
import { AuthenticatedUser } from '../../../auth/types/authenticated-user.interface';
import { CardSortingService } from '../card-sorting.service';

describe('CardSortingService analytics y ciclo de vida', () => {
  const user = {
    id: 'evaluador-1',
    rol: 'ESTUDIANTE',
    actor: 'EVALUADOR',
  } as AuthenticatedUser;

  function createService() {
    const prisma = {
      researchSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      consentimiento: { findFirst: jest.fn() },
      cardGrouping: { findMany: jest.fn() },
    };
    const projectAccess = { assertAccess: jest.fn() };
    return {
      prisma,
      service: new CardSortingService(
        prisma as unknown as PrismaService,
        projectAccess as unknown as ProjectAccessService,
      ),
    };
  }

  it('consolida por nombre las categorías abiertas creadas por participantes distintos', async () => {
    const { prisma, service } = createService();
    prisma.researchSession.findUnique.mockResolvedValue({
      id: 'estudio-1',
      nombre: 'Navegación principal',
      proyectoId: 'proyecto-1',
      evaluadorId: user.id,
      tipo: TipoSesion.CARD_SORTING,
      actor: ActorSesion.EVALUADOR,
      cerrado: false,
      createdAt: new Date('2026-09-13T12:00:00Z'),
      cardsDefinidas: [
        { id: 'card-1', etiqueta: 'Biblioteca' },
        { id: 'card-2', etiqueta: 'Calendario' },
      ],
    });
    prisma.researchSession.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
    prisma.cardGrouping.findMany.mockResolvedValue([
      {
        participanteSesionId: 'p-1',
        cardId: 'card-1',
        categoryId: 'category-a',
        card: { id: 'card-1', etiqueta: 'Biblioteca' },
        category: { id: 'category-a', nombre: 'Servicios' },
      },
      {
        participanteSesionId: 'p-1',
        cardId: 'card-2',
        categoryId: 'category-a',
        card: { id: 'card-2', etiqueta: 'Calendario' },
        category: { id: 'category-a', nombre: 'Servicios' },
      },
      {
        participanteSesionId: 'p-2',
        cardId: 'card-1',
        categoryId: 'category-b',
        card: { id: 'card-1', etiqueta: 'Biblioteca' },
        category: { id: 'category-b', nombre: ' servicios ' },
      },
      {
        participanteSesionId: 'p-2',
        cardId: 'card-2',
        categoryId: 'category-b',
        card: { id: 'card-2', etiqueta: 'Calendario' },
        category: { id: 'category-b', nombre: ' servicios ' },
      },
    ]);

    const analytics = await service.getAnalytics('estudio-1', user);

    expect(analytics.categorias).toEqual(['Servicios']);
    expect(analytics.matrizSimilitud).toEqual([[100, 100], [100, 100]]);
    expect(analytics.clusters).toEqual([
      { nombre: 'Servicios', tarjetas: ['Biblioteca', 'Calendario'], acuerdo: 100 },
    ]);
    expect(analytics.resultsMatrix.filas[0].valores).toEqual([2]);
    expect(analytics.popularPlacementsMatrix.filas[0].valores).toEqual([100]);
  });

  it('permite al docente dueño de la sala consultar la sesión del Card Sorting', async () => {
    const { prisma, service } = createService();
    const docente = {
      id: 'docente-1',
      rol: 'DOCENTE',
      actor: 'EVALUADOR',
    } as AuthenticatedUser;

    const session = {
      id: 'estudio-1',
      proyectoId: 'proyecto-1',
      evaluadorId: 'estudiante-1',
      tipo: TipoSesion.CARD_SORTING,
      actor: ActorSesion.EVALUADOR,
      cerrado: false,
      cardsDefinidas: [],
      categoriasDefinidas: [],
      agrupaciones: [],
      estudio: null,
      proyecto: { sala: { profesorId: docente.id } },
    };
    prisma.researchSession.findUnique.mockResolvedValue(session);

    await expect(service.getSession('estudio-1', docente)).resolves.toEqual(session);
  });

  it('permite al docente dueño de la sala consultar la analítica del Card Sorting', async () => {
    const { prisma, service } = createService();
    const docente = {
      id: 'docente-1',
      rol: 'DOCENTE',
      actor: 'EVALUADOR',
    } as AuthenticatedUser;

    prisma.researchSession.findUnique.mockResolvedValue({
      id: 'estudio-1',
      nombre: 'Navegación principal',
      proyectoId: 'proyecto-1',
      evaluadorId: 'estudiante-1',
      tipo: TipoSesion.CARD_SORTING,
      actor: ActorSesion.EVALUADOR,
      cerrado: false,
      createdAt: new Date('2026-09-13T12:00:00Z'),
      cardsDefinidas: [],
      proyecto: { sala: { profesorId: docente.id } },
    });
    prisma.researchSession.findMany.mockResolvedValue([]);
    prisma.cardGrouping.findMany.mockResolvedValue([]);

    await expect(service.getAnalytics('estudio-1', docente)).resolves.toMatchObject({
      participantesCount: 0,
      cardsCount: 0,
      estudio: {
        id: 'estudio-1',
        proyectoId: 'proyecto-1',
      },
    });
  });

  it('permite cerrar y volver a abrir el estudio sin borrar resultados', async () => {
    const { prisma, service } = createService();
    prisma.researchSession.findUnique.mockResolvedValue({
      id: 'estudio-1',
      evaluadorId: user.id,
      tipo: TipoSesion.CARD_SORTING,
      actor: ActorSesion.EVALUADOR,
      estado: EstadoSesion.INVITADO,
    });
    prisma.researchSession.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'estudio-1', ...data }),
    );

    await expect(service.cerrarEstudio('estudio-1', true, user)).resolves.toMatchObject({ cerrado: true });
    await expect(service.cerrarEstudio('estudio-1', false, user)).resolves.toMatchObject({ cerrado: false });
    expect(prisma.researchSession.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'estudio-1' },
      data: { cerrado: true },
      include: { cardsDefinidas: true, categoriasDefinidas: true },
    });
  });

  it('no permite al docente dueño de la sala cerrar o reabrir un estudio ajeno', async () => {
    const { prisma, service } = createService();
    const docente = {
      id: 'docente-1',
      rol: 'DOCENTE',
      actor: 'EVALUADOR',
    } as AuthenticatedUser;

    prisma.researchSession.findUnique.mockResolvedValue({
      id: 'estudio-1',
      evaluadorId: 'estudiante-1',
      tipo: TipoSesion.CARD_SORTING,
      actor: ActorSesion.EVALUADOR,
      estado: EstadoSesion.INVITADO,
    });

    await expect(service.cerrarEstudio('estudio-1', true, docente)).rejects.toMatchObject({
      status: 403,
    });
    expect(prisma.researchSession.update).not.toHaveBeenCalled();
  });

  it('no permite a ADMIN cerrar o reabrir estudios de estudiantes', async () => {
    const { prisma, service } = createService();
    const admin = {
      id: 'admin-1',
      rol: 'ADMIN',
      actor: 'EVALUADOR',
    } as AuthenticatedUser;

    prisma.researchSession.findUnique.mockResolvedValue({
      id: 'estudio-1',
      evaluadorId: 'estudiante-1',
      tipo: TipoSesion.CARD_SORTING,
      actor: ActorSesion.EVALUADOR,
      estado: EstadoSesion.INVITADO,
    });

    await expect(service.cerrarEstudio('estudio-1', true, admin)).rejects.toMatchObject({
      status: 403,
    });
    expect(prisma.researchSession.update).not.toHaveBeenCalled();
  });

  it('devuelve la misma sesión si el participante ya completó el estudio', async () => {
    const { prisma, service } = createService();
    const participant = {
      id: 'participante-1',
      rol: 'PARTICIPANTE',
      actor: 'PARTICIPANTE',
      proyectoId: 'proyecto-1',
    } as AuthenticatedUser;
    const completedSession = {
      id: 'sesion-completada',
      proyectoId: 'proyecto-1',
      participanteId: participant.id,
      estudioId: 'estudio-1',
      tipo: TipoSesion.CARD_SORTING,
      actor: ActorSesion.PARTICIPANTE,
      estado: EstadoSesion.COMPLETADO,
      estudio: { id: 'estudio-1', cerrado: false },
    };
    prisma.researchSession.findUnique
      .mockResolvedValueOnce({
        id: 'estudio-1',
        proyectoId: 'proyecto-1',
        tipo: TipoSesion.CARD_SORTING,
        actor: ActorSesion.EVALUADOR,
        cerrado: false,
      })
      .mockResolvedValueOnce(completedSession);
    prisma.consentimiento.findFirst.mockResolvedValue({ aceptado: true });
    prisma.researchSession.findFirst.mockResolvedValue(completedSession);

    await expect(service.joinSession('estudio-1', participant)).resolves.toEqual(completedSession);
    expect(prisma.researchSession.create).not.toHaveBeenCalled();
    expect(prisma.researchSession.findFirst).toHaveBeenCalledWith({
      where: {
        estudioId: 'estudio-1',
        participanteId: participant.id,
        estado: {
          in: [EstadoSesion.INVITADO, EstadoSesion.EN_PROGRESO, EstadoSesion.COMPLETADO],
        },
      },
    });
  });
});
