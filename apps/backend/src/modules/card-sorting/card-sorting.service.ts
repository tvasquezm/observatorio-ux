// apps/backend/src/modules/card-sorting/card-sorting.service.ts
//
// Lógica de negocio de Card Sorting sobre el modelo relacional
// (Card / Category / CardGrouping). Aislamiento: solo importa
// PrismaService desde core/database.

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

type Grupo = {
  categoriaId?: string;
  categoriaNombre?: string;
  cardIds: string[];
};

@Injectable()
export class CardSortingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea la sesión maestra de un estudio de Card Sorting (la arma el
   * evaluador). Nace con sus Cards y, si es CERRADO, sus Categories
   * predefinidas, en un único create anidado.
   */
  async createSession(
    proyectoId: string,
    evaluadorId: string,
    params: {
      tipo: TipoCardSorting;
      tarjetas: string[];
      categorias?: string[];
    },
  ) {
    return this.prisma.researchSession.create({
      data: {
        proyectoId,
        evaluadorId,
        tipo: TipoSesion.CARD_SORTING,
        estado: EstadoSesion.INVITADO,
        actor: ActorSesion.EVALUADOR,
        tipoCardSorting: params.tipo,
        cardsDefinidas: {
          create: params.tarjetas.map((etiqueta) => ({ etiqueta })),
        },
        categoriasDefinidas:
          params.tipo === 'CERRADO' && params.categorias
            ? {
                create: params.categorias.map((nombre) => ({
                  nombre,
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
   * Un participante se une a un estudio existente: crea SU PROPIA
   * ResearchSession (actor = PARTICIPANTE), enlazada a la maestra vía
   * estudioId. No requiere JwtAuthGuard porque Participante no tiene
   * relación con Usuario/JWT en el schema.
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
        `No existe un estudio de Card Sorting con id ${estudioId}`,
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
   * Obtiene una sesión de Card Sorting (maestra o de participante) con
   * sus relaciones cargadas para que el frontend pueda pintar el tablero.
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
   * Registra el agrupamiento completo de un participante y marca su
   * sesión como completada. Todo en una transacción: o se guardan todos
   * los CardGrouping y se actualiza el estado, o no se guarda nada.
   *
   * Validaciones de negocio que NO puede hacer el DTO (porque requieren
   * la base de datos):
   * - Las cardIds deben pertenecer al estudio del participante.
   * - categoriaId debe pertenecer al mismo estudio.
   * - categoriaNombre (categoría nueva) solo es válido si el estudio es
   *   ABIERTO; si el participante repite el mismo nombre en dos grupos
   *   dentro del mismo envío, se reusa la misma Category (no se duplica).
   */
  async submitResult(participanteSesionId: string, grupos: Grupo[]) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.researchSession.findUnique({
        where: { id: participanteSesionId },
      });

      if (!session || session.tipo !== TipoSesion.CARD_SORTING) {
        throw new NotFoundException(
          `No existe una sesión de Card Sorting con id ${participanteSesionId}`,
        );
      }

      if (session.actor !== ActorSesion.PARTICIPANTE || !session.estudioId) {
        throw new ForbiddenException(
          'Solo una sesión de participante asociada a un estudio puede enviar resultados.',
        );
      }

      const estudio = await tx.researchSession.findUniqueOrThrow({
        where: { id: session.estudioId },
      });

      const cardsDelEstudio = await tx.card.findMany({
        where: { sessionId: estudio.id },
        select: { id: true },
      });
      const cardIdsValidas = new Set(cardsDelEstudio.map((c) => c.id));

      // Cache local para no crear la misma categoría nueva dos veces
      // dentro del mismo envío (ej. el participante repitió el nombre
      // "Finanzas" en dos grupos por error de UI).
      const categoriaNuevaCache = new Map<string, string>();

      const groupingsAInsertar: { cardId: string; categoryId: string }[] =
        [];

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
          // No debería llegar acá si el DTO validó bien, pero el
          // servicio no confía ciegamente en la capa de arriba.
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

      // createMany respeta el @@unique([participanteSesionId, cardId]):
      // si el propio payload trae la misma card dos veces, Postgres
      // rechaza el batch completo con P2002 antes de escribir nada raro.
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