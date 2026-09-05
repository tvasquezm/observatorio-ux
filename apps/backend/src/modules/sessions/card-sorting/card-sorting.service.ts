import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActorSesion,
  EstadoSesion,
  Prisma,
  TipoCardSorting,
  TipoSesion,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { ProjectAccessService } from '../../../core/access/project-access.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import {
  CardSortingTypeDto,
  CreateCardSortingSessionDto,
} from './dto/card-sorting.dto';

export type Grupo = {
  categoriaId?: string;
  categoriaNombre?: string;
  cardIds: string[];
};

@Injectable()
export class CardSortingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async createSession(dto: CreateCardSortingSessionDto, user: AuthenticatedUser) {
    await this.projectAccess.assertAccess(
      dto.proyectoId,
      user,
      'No tienes acceso para crear estudios en este proyecto.',
    );

    const tipo =
      dto.tipo === CardSortingTypeDto.CLOSED
        ? TipoCardSorting.CERRADO
        : TipoCardSorting.ABIERTO;

    if (tipo === TipoCardSorting.CERRADO && !dto.categorias?.length) {
      throw new BadRequestException(
        'Un Card Sorting cerrado requiere al menos una categoría predefinida.',
      );
    }

    const participantSession = await this.prisma.researchSession.create({
      data: {
        proyectoId: dto.proyectoId,
        evaluadorId: user.id,
        tipo: TipoSesion.CARD_SORTING,
        estado: EstadoSesion.INVITADO,
        actor: ActorSesion.EVALUADOR,
        tipoCardSorting: tipo,
        cardsDefinidas: {
          create: dto.tarjetas.map((tarjeta) => ({
            etiqueta: tarjeta.etiqueta.trim(),
          })),
        },
        categoriasDefinidas:
          dto.categorias?.length
            ? {
                create: dto.categorias.map((categoria) => ({
                  nombre: categoria.nombre.trim(),
                  esPredefinida: true,
                })),
              }
            : undefined,
      },
      include: { cardsDefinidas: true, categoriasDefinidas: true },
    });

    return this.getSession(participantSession.id, user);
  }

  async joinSession(estudioId: string, user: AuthenticatedUser) {
    const estudio = await this.prisma.researchSession.findUnique({
      where: { id: estudioId },
    });

    if (
      !estudio ||
      estudio.tipo !== TipoSesion.CARD_SORTING ||
      estudio.actor !== ActorSesion.EVALUADOR
    ) {
      throw new NotFoundException('No existe el estudio maestro solicitado.');
    }

    if (user.proyectoId && user.proyectoId !== estudio.proyectoId) {
      throw new ForbiddenException('El token no corresponde a este proyecto.');
    }

    const consent = await this.prisma.consentimiento.findFirst({
      where: {
        participanteId: user.id,
        proyectoId: estudio.proyectoId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!consent?.aceptado) {
      throw new ForbiddenException('No existe consentimiento para este proyecto.');
    }

    const existing = await this.prisma.researchSession.findFirst({
      where: {
        estudioId,
        participanteId: user.id,
        estado: { in: [EstadoSesion.INVITADO, EstadoSesion.EN_PROGRESO] },
      },
    });

    if (existing) return this.getSession(existing.id, user);

    const participantSession = await this.prisma.researchSession.create({
      data: {
        proyectoId: estudio.proyectoId,
        participanteId: user.id,
        estudioId,
        tipo: TipoSesion.CARD_SORTING,
        estado: EstadoSesion.EN_PROGRESO,
        actor: ActorSesion.PARTICIPANTE,
      },
    });

    return this.getSession(participantSession.id, user);
  }

  async getSession(id: string, user: AuthenticatedUser) {
    const session = await this.prisma.researchSession.findUnique({
      where: { id },
      include: {
        cardsDefinidas: true,
        categoriasDefinidas: true,
        agrupaciones: { include: { card: true, category: true } },
        estudio: { include: { cardsDefinidas: true, categoriasDefinidas: true } },
      },
    });

    if (!session || session.tipo !== TipoSesion.CARD_SORTING) {
      throw new NotFoundException('La sesión de Card Sorting no existe.');
    }

    const canRead =
      user.rol === 'ADMIN' ||
      (user.actor === 'EVALUADOR' && session.evaluadorId === user.id) ||
      (user.actor === 'PARTICIPANTE' &&
        (session.participanteId === user.id ||
          (session.actor === ActorSesion.EVALUADOR &&
            user.proyectoId === session.proyectoId)));

    if (!canRead) throw new ForbiddenException('No tienes acceso a esta sesión.');
    return session;
  }

  /**
   * Analítica agregada del estudio maestro, calculada 100% desde las
   * agrupaciones reales enviadas por los participantes (CardGrouping).
   * No inventa métricas: si todavía no hay participantes completados,
   * devuelve arrays/objetos vacíos en vez de datos de ejemplo.
   */
  async getAnalytics(estudioId: string, user: AuthenticatedUser) {
    const estudio = await this.prisma.researchSession.findUnique({
      where: { id: estudioId },
      include: { cardsDefinidas: true },
    });

    if (
      !estudio ||
      estudio.tipo !== TipoSesion.CARD_SORTING ||
      estudio.actor !== ActorSesion.EVALUADOR
    ) {
      throw new NotFoundException('No existe el estudio maestro solicitado.');
    }

    if (user.rol !== 'ADMIN' && estudio.evaluadorId !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta analítica.');
    }

    const participantes = await this.prisma.researchSession.findMany({
      where: {
        estudioId,
        actor: ActorSesion.PARTICIPANTE,
        estado: EstadoSesion.COMPLETADO,
      },
      select: { id: true },
    });

    const groupings = await this.prisma.cardGrouping.findMany({
      where: { participanteSesionId: { in: participantes.map((p) => p.id) } },
      include: { card: true, category: true },
    });

    const cards = estudio.cardsDefinidas;
    const participantesCount = participantes.length;

    // Mapa participanteSesionId -> (cardId -> categoryId) para calcular
    // co-ocurrencias por participante.
    const porParticipante = new Map<string, Map<string, string>>();
    for (const g of groupings) {
      if (!porParticipante.has(g.participanteSesionId)) {
        porParticipante.set(g.participanteSesionId, new Map());
      }
      porParticipante.get(g.participanteSesionId)!.set(g.cardId, g.categoryId);
    }

    // Matriz de similitud: % de participantes que agruparon cada par de
    // tarjetas juntas en la misma categoría.
    const matriz: number[][] = cards.map(() => cards.map(() => 0));
    if (participantesCount > 0) {
      for (let i = 0; i < cards.length; i++) {
        for (let j = 0; j < cards.length; j++) {
          if (i === j) {
            matriz[i][j] = 100;
            continue;
          }
          let coincidencias = 0;
          for (const asignaciones of porParticipante.values()) {
            const catA = asignaciones.get(cards[i].id);
            const catB = asignaciones.get(cards[j].id);
            if (catA && catB && catA === catB) coincidencias++;
          }
          matriz[i][j] = Math.round((coincidencias / participantesCount) * 100);
        }
      }
    }

    // Frecuencia por nombre de categoría (predefinida o creada en abierto).
    const frecuenciaPorCategoria = new Map<string, number>();
    for (const g of groupings) {
      frecuenciaPorCategoria.set(
        g.category.nombre,
        (frecuenciaPorCategoria.get(g.category.nombre) ?? 0) + 1,
      );
    }
    const totalAsignaciones = groupings.length || 1;
    const frecuencia = [...frecuenciaPorCategoria.entries()]
      .map(([nombre, count]) => ({
        nombre,
        count,
        porcentaje: Math.round((count / totalAsignaciones) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Clústeres: por cada tarjeta, su categoría más frecuente entre
    // participantes; se agrupan tarjetas que comparten esa categoría.
    const clusterMap = new Map<string, { nombre: string; cardIds: string[]; totalVotos: number; votosGanador: number }>();
    for (const card of cards) {
      const conteo = new Map<string, number>();
      for (const asignaciones of porParticipante.values()) {
        const catId = asignaciones.get(card.id);
        if (!catId) continue;
        conteo.set(catId, (conteo.get(catId) ?? 0) + 1);
      }
      if (conteo.size === 0) continue;
      const [catIdGanadora, votos] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0];
      const nombreCat = groupings.find((g) => g.categoryId === catIdGanadora)?.category.nombre ?? 'Sin nombre';
      const totalVotosCard = [...conteo.values()].reduce((a, b) => a + b, 0);
      const entry = clusterMap.get(catIdGanadora) ?? {
        nombre: nombreCat,
        cardIds: [],
        totalVotos: 0,
        votosGanador: 0,
      };
      entry.cardIds.push(card.etiqueta);
      entry.totalVotos += totalVotosCard;
      entry.votosGanador += votos;
      clusterMap.set(catIdGanadora, entry);
    }
    const clusters = [...clusterMap.values()]
      .map((c) => ({
        nombre: c.nombre,
        tarjetas: c.cardIds,
        acuerdo: c.totalVotos > 0 ? Math.round((c.votosGanador / c.totalVotos) * 100) : 0,
      }))
      .sort((a, b) => b.acuerdo - a.acuerdo);

    // Acuerdo global: promedio de la matriz de similitud (excluyendo diagonal).
    let sumaSimilitud = 0;
    let pares = 0;
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        sumaSimilitud += matriz[i][j];
        pares++;
      }
    }
    const acuerdoGlobal = pares > 0 ? Math.round(sumaSimilitud / pares) : 0;

    return {
      participantesCount,
      cardsCount: cards.length,
      acuerdoGlobal,
      tarjetas: cards.map((c) => c.etiqueta),
      matrizSimilitud: matriz,
      frecuenciaPorCategoria: frecuencia,
      clusters,
    };
  }

  async submitResult(
    participanteSesionId: string,
    grupos: Grupo[],
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const session = await tx.researchSession.findUnique({
        where: { id: participanteSesionId },
      });

      if (!session || session.tipo !== TipoSesion.CARD_SORTING) {
        throw new NotFoundException('La sesión de participante no existe.');
      }
      if (session.actor !== ActorSesion.PARTICIPANTE || !session.estudioId) {
        throw new ForbiddenException('La sesión no pertenece a un participante.');
      }
      if (session.participanteId !== user.id) {
        throw new ForbiddenException('No tienes permiso para enviar estos resultados.');
      }
      if (session.estado === EstadoSesion.COMPLETADO) {
        throw new ConflictException('La sesión ya fue completada.');
      }

      const study = await tx.researchSession.findUniqueOrThrow({
        where: { id: session.estudioId },
      });
      const cards = await tx.card.findMany({
        where: { sessionId: study.id },
        select: { id: true },
      });
      const validCardIds = new Set(cards.map((card) => card.id));
      const seenCardIds = new Set<string>();
      const categoryCache = new Map<string, string>();
      const groupings: { cardId: string; categoryId: string }[] = [];

      for (const group of grupos) {
        if (!group.categoriaId && !group.categoriaNombre?.trim()) {
          throw new BadRequestException(
            'Cada grupo requiere categoriaId o categoriaNombre.',
          );
        }

        let categoryId: string;
        if (group.categoriaId) {
          const category = await tx.category.findUnique({
            where: { id: group.categoriaId },
          });
          if (!category || category.sessionId !== study.id) {
            throw new BadRequestException('La categoría no pertenece a este estudio.');
          }
          categoryId = category.id;
        } else {
          if (study.tipoCardSorting !== TipoCardSorting.ABIERTO) {
            throw new BadRequestException(
              'Solo los estudios abiertos permiten crear categorías nuevas.',
            );
          }
          const name = group.categoriaNombre!.trim();
          const cacheKey = name.toLocaleLowerCase();
          categoryId = categoryCache.get(cacheKey) ?? '';
          if (!categoryId) {
            const category = await tx.category.create({
              data: {
                sessionId: study.id,
                nombre: name,
                esPredefinida: false,
                creadaPorParticipanteId: session.participanteId!,
              },
            });
            categoryId = category.id;
            categoryCache.set(cacheKey, category.id);
          }
        }

        for (const cardId of group.cardIds) {
          if (!validCardIds.has(cardId)) {
            throw new BadRequestException('Una tarjeta no pertenece a este estudio.');
          }
          if (seenCardIds.has(cardId)) {
            throw new BadRequestException('Una tarjeta no puede pertenecer a dos grupos.');
          }
          seenCardIds.add(cardId);
          groupings.push({ cardId, categoryId });
        }
      }

      if (seenCardIds.size !== validCardIds.size) {
        throw new BadRequestException(
          'Todas las tarjetas del estudio deben quedar asignadas a un grupo.',
        );
      }

      await tx.cardGrouping.createMany({
        data: groupings.map((grouping) => ({
          ...grouping,
          participanteSesionId,
        })),
      });

      await tx.researchSession.update({
        where: { id: participanteSesionId },
        data: { estado: EstadoSesion.COMPLETADO, completadoAt: new Date() },
      });

      return tx.researchSession.findUniqueOrThrow({
        where: { id: participanteSesionId },
        include: { agrupaciones: { include: { card: true, category: true } } },
      });
    });
  }
}
