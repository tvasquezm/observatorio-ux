import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EstadoSesion,
  TipoSesion,
  ActorSesion,
  TipoCardSorting,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

export type Grupo = {
  categoriaId?: string;
  categoriaNombre?: string;
  cardIds: string[];
};

@Injectable()
export class CardSortingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea la sesión maestra de un estudio de Card Sorting.
   */
  async createSession(
    proyectoId: string,
    tarjetas: { etiqueta: string }[],
    categorias: { nombre: string }[] = [],
    tipo: TipoCardSorting = TipoCardSorting.ABIERTO,
  ) {
    return this.prisma.researchSession.create({
      data: {
        proyectoId,
        tipo: TipoSesion.CARD_SORTING,
        estado: EstadoSesion.INVITADO,
        actor: ActorSesion.EVALUADOR,
        tipoCardSorting: tipo,
        // Al no tener JWT en esta prueba, omitimos evaluadorId (es opcional en la BD)
        cardsDefinidas: {
          create: tarjetas.map((t) => ({ etiqueta: t.etiqueta })),
        },
        categoriasDefinidas:
          tipo === TipoCardSorting.CERRADO && categorias.length > 0
            ? {
                create: categorias.map((c) => ({
                  nombre: c.nombre,
                  esPredefinida: true,
                })),
              }
            : undefined,
      },
      include: {
        cardsDefinidas: true,
        categoriasDefinidas: true,
      },
    });
  }

  /**
   * Un participante se une a un estudio existente.
   * `participanteId` ahora proviene del JWT, no del Body.
   */
  async joinSession(estudioId: string, participanteId: string) {
    const estudio = await this.prisma.researchSession.findUnique({
      where: { id: estudioId },
    });

    if (
      !estudio ||
      estudio.tipo !== TipoSesion.CARD_SORTING ||
      estudio.actor !== ActorSesion.EVALUADOR
    ) {
      throw new NotFoundException(
        `No existe un estudio de Card Sorting maestro con id ${estudioId}`,
      );
    }

    return this.prisma.researchSession.create({
      data: {
        proyectoId: estudio.proyectoId,
        participanteId,
        estudioId,
        tipo: TipoSesion.CARD_SORTING,
        estado: EstadoSesion.EN_PROGRESO,
        actor: ActorSesion.PARTICIPANTE,
      },
    });
  }

  /**
   * Obtiene una sesión de Card Sorting.
   */
  async getSession(id: string) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id },
      include: {
        cardsDefinidas: true,
        categoriasDefinidas: true,
        agrupaciones: { include: { card: true, category: true } },
        estudio: {
          include: { cardsDefinidas: true, categoriasDefinidas: true },
        },
      },
    });

    if (!session || session.tipo !== TipoSesion.CARD_SORTING) {
      throw new NotFoundException(
        `No existe una sesión de Card Sorting con id ${id}`,
      );
    }

    return session;
  }

  /**
   * Registra el agrupamiento completo de un participante en 3FN.
   *
   * `currentUserId` viene del JWT (inyectado por el controller vía
   * @CurrentUser()) y se usa para verificar que quien envía el resultado
   * es efectivamente el dueño de la sesión de participante. Antes de este
   * cambio, cualquier usuario autenticado que conociera el id de una
   * sesión ajena podía sobrescribir sus resultados (IDOR).
   */
  async submitResult(
    participanteSesionId: string,
    grupos: Grupo[],
    currentUserId: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const session = await tx.researchSession.findUnique({
        where: { id: participanteSesionId },
      });

      if (!session || session.tipo !== TipoSesion.CARD_SORTING) {
        throw new NotFoundException(
          `No existe una sesión con id ${participanteSesionId}`,
        );
      }

      if (session.actor !== ActorSesion.PARTICIPANTE || !session.estudioId) {
        throw new ForbiddenException(
          'Solo una sesión de participante asociada a un estudio puede enviar resultados.',
        );
      }

      if (session.participanteId !== currentUserId) {
        throw new ForbiddenException(
          'No tienes permiso para enviar resultados en esta sesión.',
        );
      }

      const estudio = await tx.researchSession.findUniqueOrThrow({
        where: { id: session.estudioId },
      });

      const cardsDelEstudio = await tx.card.findMany({
        where: { sessionId: estudio.id },
        select: { id: true },
      });
      const cardIdsValidas = new Set(cardsDelEstudio.map((c: any) => c.id));

      const categoriaNuevaCache = new Map<string, string>();
      const groupingsAInsertar: { cardId: string; categoryId: string }[] = [];

      for (const grupo of grupos) {
        let categoryId: string;

        if (grupo.categoriaId) {
          const categoria = await tx.category.findUnique({
            where: { id: grupo.categoriaId },
          });

          if (!categoria || categoria.sessionId !== estudio.id) {
            throw new BadRequestException(
              `La categoría ${grupo.categoriaId} no pertenece a este estudio.`,
            );
          }
          categoryId = categoria.id;
        } else if (grupo.categoriaNombre) {
          if (estudio.tipoCardSorting !== TipoCardSorting.ABIERTO) {
            throw new BadRequestException(
              'Solo se pueden crear categorías nuevas en un estudio ABIERTO.',
            );
          }

          const cacheKey = grupo.categoriaNombre.trim().toLowerCase();

          if (categoriaNuevaCache.has(cacheKey)) {
            categoryId = categoriaNuevaCache.get(cacheKey)!;
          } else {
            const nuevaCategoria = await tx.category.create({
              data: {
                sessionId: estudio.id,
                nombre: grupo.categoriaNombre,
                esPredefinida: false,
                creadaPorParticipanteId: session.participanteId,
              },
            });
            categoryId = nuevaCategoria.id;
            categoriaNuevaCache.set(cacheKey, categoryId);
          }
        } else {
          throw new BadRequestException(
            'Cada grupo requiere categoriaId o categoriaNombre.',
          );
        }

        for (const cardId of grupo.cardIds) {
          if (!cardIdsValidas.has(cardId)) {
            throw new BadRequestException(
              `La tarjeta ${cardId} no pertenece a este estudio.`,
            );
          }
          groupingsAInsertar.push({ cardId, categoryId });
        }
      }

      await tx.cardGrouping.createMany({
        data: groupingsAInsertar.map((g) => ({
          ...g,
          participanteSesionId,
        })),
      });

      await tx.researchSession.update({
        where: { id: participanteSesionId },
        data: {
          estado: EstadoSesion.COMPLETADO,
          completadoAt: new Date(),
        },
      });

      return tx.researchSession.findUniqueOrThrow({
        where: { id: participanteSesionId },
        include: { agrupaciones: { include: { card: true, category: true } } },
      });
    });
  }
}