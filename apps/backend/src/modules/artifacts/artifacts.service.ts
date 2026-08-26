import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoArtefacto } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import {
  JourneyMapSchema,
  MomentosCriticosSchema,
  PersonaSchema,
} from '@observatorio-ux/shared-types';
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import {
  AcquireLockDto,
  CreateArtifactDto,
  CreateArtifactVersionDto,
} from './artifacts.dto';

/** TTL por defecto del bloqueo pesimista si el cliente no envía uno propio. */
const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutos
/** Tope máximo, para que un cliente no pueda pedir un lock "eterno". */
const MAX_LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutos

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    proyectoId: string,
    dto: CreateArtifactDto,
    user: AuthenticatedUser,
  ) {
    await this.assertProjectAccess(proyectoId, user);
    this.validateContenidoByTipo(dto.tipo, dto.contenido);

    return this.prisma.uxArtifact.create({
      data: {
        proyectoId,
        tipo: dto.tipo,
        artefactoLogicoId: dto.artefactoLogicoId?.trim() || randomUUID(),
        version: 1,
        contenido: dto.contenido as Prisma.InputJsonValue,
        autorId: user.id,
      },
    });
  }

  async findAll(
    proyectoId: string,
    tipo: TipoArtefacto | undefined,
    user: AuthenticatedUser,
  ) {
    await this.assertProjectAccess(proyectoId, user);

    return this.prisma.uxArtifact.findMany({
      where: { proyectoId, ...(tipo ? { tipo } : {}) },
      orderBy: [{ artefactoLogicoId: 'asc' }, { version: 'desc' }],
    });
  }

  async findOne(artefactoId: string, user: AuthenticatedUser) {
    const artifact = await this.prisma.uxArtifact.findUnique({
      where: { id: artefactoId },
    });

    if (!artifact) throw new NotFoundException('El artefacto no existe.');
    await this.assertProjectAccess(artifact.proyectoId, user);
    return artifact;
  }

  async createVersion(
    artefactoId: string,
    dto: CreateArtifactVersionDto,
    user: AuthenticatedUser,
  ) {
    const artifact = await this.findOne(artefactoId, user);
    const latest = await this.getLatestVersion(artifact.artefactoLogicoId, artifact);

    // El chequeo de lock se hace siempre contra la ÚLTIMA versión del
    // artefacto lógico, no contra la fila que llegó en la URL: si el
    // cliente pasó un id de una versión vieja, igual respetamos el lock
    // vigente sobre el estado actual del artefacto.
    this.assertNotLockedByOther(latest, user);

    // El tipo se hereda del artefacto lógico existente, no del DTO.
    this.validateContenidoByTipo(artifact.tipo, dto.contenido);

    // La nueva fila nace sin lock (lockedById/lockedUntil quedan null por
    // default del schema): guardar una versión cierra, de hecho, la sesión
    // de edición que originó el lock sobre la versión anterior.
    return this.prisma.uxArtifact.create({
      data: {
        proyectoId: artifact.proyectoId,
        tipo: artifact.tipo,
        artefactoLogicoId: artifact.artefactoLogicoId,
        version: latest.version + 1,
        contenido: dto.contenido as Prisma.InputJsonValue,
        autorId: user.id,
      },
    });
  }

  /**
   * Adquiere (o renueva) el bloqueo pesimista sobre la ÚLTIMA versión de un
   * artefacto lógico. Cierra B4/B9/B14: antes de este método, `lockedById`/
   * `lockedUntil` se leían en `createVersion` pero nada los escribía nunca,
   * así que el lock jamás se activaba.
   *
   * Si el propio usuario ya tiene el lock, lo renueva (extiende el TTL) en
   * vez de fallar, para soportar "heartbeats" desde el frontend mientras el
   * usuario sigue editando.
   */
  async acquireLock(
    artefactoId: string,
    user: AuthenticatedUser,
    ttlSegundos?: number,
  ) {
    const artifact = await this.findOne(artefactoId, user);
    const latest = await this.getLatestVersion(artifact.artefactoLogicoId, artifact);

    this.assertNotLockedByOther(latest, user);

    const ttlMs = this.resolveTtlMs(ttlSegundos);
    const lockedUntil = new Date(Date.now() + ttlMs);

    return this.prisma.uxArtifact.update({
      where: { id: latest.id },
      data: { lockedById: user.id, lockedUntil },
    });
  }

  /**
   * Libera el lock sobre la última versión de un artefacto lógico. Solo
   * quien lo tiene (o un ADMIN) puede liberarlo explícitamente; si ya expiró
   * o nunca existió, no falla — liberar es idempotente.
   */
  async releaseLock(artefactoId: string, user: AuthenticatedUser) {
    const artifact = await this.findOne(artefactoId, user);
    const latest = await this.getLatestVersion(artifact.artefactoLogicoId, artifact);

    const lockActive = !!latest.lockedById && this.isLockActive(latest.lockedUntil);

    if (lockActive && latest.lockedById !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'No puedes liberar un bloqueo que pertenece a otro usuario.',
      );
    }

    return this.prisma.uxArtifact.update({
      where: { id: latest.id },
      data: { lockedById: null, lockedUntil: null },
    });
  }

  /**
   * Busca la versión más reciente de un artefacto lógico. `fallback` es la
   * fila que ya tenemos en mano (típicamente la que trajo `findOne`): si por
   * la razón que sea `findFirst` no devuelve nada —no debería pasar en la
   * práctica, ya que la propia fila de `fallback` matchea el where—, seguimos
   * operando sobre esa fila en vez de fallar.
   */
  private async getLatestVersion<
    T extends {
      id: string;
      version: number;
      lockedById: string | null;
      lockedUntil: Date | null;
    },
  >(artefactoLogicoId: string, fallback: T): Promise<T> {
    const latest = await this.prisma.uxArtifact.findFirst({
      where: { artefactoLogicoId },
      orderBy: { version: 'desc' },
    });

    return (latest as T | null) ?? fallback;
  }

  private isLockActive(lockedUntil: Date | null): boolean {
    return !!lockedUntil && lockedUntil > new Date();
  }

  private assertNotLockedByOther(
    artifact: { lockedById: string | null; lockedUntil: Date | null },
    user: AuthenticatedUser,
  ): void {
    const lockedByOther = artifact.lockedById && artifact.lockedById !== user.id;
    if (lockedByOther && this.isLockActive(artifact.lockedUntil)) {
      throw new ConflictException('El artefacto está bloqueado por otro usuario.');
    }
  }

  private resolveTtlMs(ttlSegundos?: number): number {
    if (!ttlSegundos) return DEFAULT_LOCK_TTL_MS;
    const requestedMs = ttlSegundos * 1000;
    return Math.min(Math.max(requestedMs, 1000), MAX_LOCK_TTL_MS);
  }

  private async assertProjectAccess(proyectoId: string, user: AuthenticatedUser) {
    const project = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { creadoPorId: true },
    });

    if (!project) throw new NotFoundException('El proyecto no existe.');
    if (project.creadoPorId !== user.id && user.rol !== 'ADMIN') {
      throw new ForbiddenException('No tienes acceso a este proyecto.');
    }
  }

  /**
   * Valida el campo `contenido` de un UxArtifact según su `tipo` polimórfico
   * (enum TipoArtefacto de Prisma). Lanza BadRequestException con el detalle
   * de los campos inválidos si la validación de Zod falla.
   */
  private validateContenidoByTipo(tipo: TipoArtefacto, contenido: unknown): void {
    switch (tipo) {
      case TipoArtefacto.JOURNEY_MAP: {
        try {
          JourneyMapSchema.parse(contenido);
        } catch (error) {
          if (error instanceof ZodError) {
            const errores = error.issues.map((issue) => ({
              campo: issue.path.join('.') || '(raíz)',
              mensaje: issue.message,
            }));

            throw new BadRequestException({
              message:
                'El contenido del Journey Map no cumple con la estructura requerida.',
              errores,
            });
          }
          throw error;
        }
        break;
      }

      case TipoArtefacto.MOMENTOS_CRITICOS: {
        try {
          MomentosCriticosSchema.parse(contenido);
        } catch (error) {
          if (error instanceof ZodError) {
            const errores = error.issues.map((issue) => ({
              campo: issue.path.join('.') || '(raíz)',
              mensaje: issue.message,
            }));

            throw new BadRequestException({
              message:
                'El contenido de Momentos Críticos no cumple con la estructura requerida.',
              errores,
            });
          }
          throw error;
        }
        break;
      }

      case TipoArtefacto.PERSONA: {
        try {
          PersonaSchema.parse(contenido);
        } catch (error) {
          if (error instanceof ZodError) {
            const errores = error.issues.map((issue) => ({
              campo: issue.path.join('.') || '(raíz)',
              mensaje: issue.message,
            }));

            throw new BadRequestException({
              message:
                'El contenido de Persona no cumple con la estructura requerida.',
              errores,
            });
          }
          throw error;
        }
        break;
      }

      // Agregar más ramas a medida que se agreguen esquemas Zod para
      // otros valores de TipoArtefacto.

      default:
        // Tipos aún sin esquema estricto: no se valida (comportamiento actual).
        break;
    }
  }
}