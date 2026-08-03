// apps/backend/src/modules/artifacts/artifacts.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UxArtifact, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const LOCK_TTL_MINUTES = 5;

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

  async lock(artifactId: string, userId: string): Promise<UxArtifact> {
    return this.prisma.$transaction(async (tx) => {
      const artifact = await tx.uxArtifact.findUnique({
        where: { id: artifactId },
      });

      if (!artifact) {
        throw new NotFoundException(`No existe UxArtifact con id ${artifactId}`);
      }

      const now = new Date();
      const newLockedUntil = new Date(now.getTime() + LOCK_TTL_MINUTES * 60 * 1000);

      const result = await tx.uxArtifact.updateMany({
        where: {
          id: artifactId,
          OR: [
            { lockedUntil: null }, 
            { lockedUntil: { lt: now } }, 
            { lockedById: userId }, 
          ],
        },
        data: {
          lockedById: userId,
          lockedUntil: newLockedUntil,
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          `El artefacto está bloqueado por otro usuario hasta ${artifact.lockedUntil?.toISOString()}`,
        );
      }

      return tx.uxArtifact.findUniqueOrThrow({ where: { id: artifactId } });
    });
  }

  async createVersion(
    artifactId: string,
    userId: string,
    contenido: Record<string, unknown>,
  ): Promise<UxArtifact> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.uxArtifact.findUnique({
        where: { id: artifactId },
      });

      if (!current) {
        throw new NotFoundException(`No existe UxArtifact con id ${artifactId}`);
      }

      const now = new Date();
      const heldByCaller =
        current.lockedById === userId &&
        current.lockedUntil !== null &&
        current.lockedUntil > now;

      if (!heldByCaller) {
        throw new ForbiddenException(
          'Necesitas adquirir el lock (POST /artifacts/:id/lock) antes de guardar una nueva versión, o tu lock ya expiró.',
        );
      }

      const latest = await tx.uxArtifact.findFirstOrThrow({
        where: { artefactoLogicoId: current.artefactoLogicoId },
        orderBy: { version: 'desc' },
      });

      try {
        const newArtifact = await tx.uxArtifact.create({
          data: {
            proyectoId: current.proyectoId,
            tipo: current.tipo,
            artefactoLogicoId: current.artefactoLogicoId,
            version: latest.version + 1,
            contenido,
            autorId: userId,
            lockedById: null,
            lockedUntil: null,
          },
        });

        // Liberamos el lock de la fila original
        await tx.uxArtifact.update({
          where: { id: artifactId },
          data: { lockedById: null, lockedUntil: null },
        });

        return newArtifact;

      } catch (error) {
        // Manejo específico de colisión de versiones en Prisma (P2002)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Colisión de versiones: Hubo un conflicto al guardar. Por favor, recarga el artefacto e inténtalo de nuevo.',
          );
        }
        throw error;
      }
    });
  }

  /**
   * Libera manualmente el bloqueo (para el sendBeacon o cuando el usuario sale)
   * Es idempotente y silencioso por diseño.
   */
  async unlock(artifactId: string, userId: string): Promise<void> {
    await this.prisma.uxArtifact.updateMany({
      where: {
        id: artifactId,
        lockedById: userId,
      },
      data: {
        lockedById: null,
        lockedUntil: null,
      },
    });
  }
}