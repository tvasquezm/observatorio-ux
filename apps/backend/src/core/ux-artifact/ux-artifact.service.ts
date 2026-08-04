// apps/backend/src/core/ux-artifact/ux-artifact.service.ts
//
// Lógica de versionado append-only + lock pesimista con TTL, compartida
// por las 3 metodologías nuevas (Persona, Journey Map, Momentos
// Críticos). Vive en core/ igual que auth/database — ninguna
// metodología reimplementa esto ni depende de otra para tenerlo.
//
// Nota: asume `PrismaService` en core/database/prisma.service.ts, que
// no vino en el zip subido — ajusta el import si tu ruta real difiere.

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UX_ARTIFACT_LOCK_TTL_MS } from '@observatorio-ux/shared-types';
import type { TipoArtefacto } from '@observatorio-ux/shared-types';

@Injectable()
export class UxArtifactService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea la primera versión (version = 1) de un artefacto lógico nuevo. */
  async crearVersionInicial(
    tipo: TipoArtefacto,
    proyectoId: string,
    contenido: unknown,
    autorId: string,
  ) {
    return this.prisma.uxArtifact.create({
      data: {
        tipo,
        proyectoId,
        artefactoLogicoId: crypto.randomUUID(),
        version: 1,
        contenido: contenido as any,
        autorId,
      },
    });
  }

  /** Devuelve la versión más reciente de un artefacto lógico. */
  async obtenerUltimaVersion(artefactoLogicoId: string) {
    const version = await this.prisma.uxArtifact.findFirst({
      where: { artefactoLogicoId },
      orderBy: { version: 'desc' },
    });

    if (!version) {
      throw new NotFoundException('El artefacto no existe.');
    }

    return version;
  }

  /** Devuelve el historial completo, ordenado de más reciente a más antiguo. */
  async obtenerHistorial(artefactoLogicoId: string) {
    return this.prisma.uxArtifact.findMany({
      where: { artefactoLogicoId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Intenta adquirir el lock pesimista sobre un artefacto lógico.
   * Falla si otro usuario tiene un lock vigente (lockedUntil > now()).
   * Es reentrante: si el mismo usuario ya tiene el lock, solo renueva el TTL.
   */
  async adquirirLock(artefactoLogicoId: string, usuarioId: string) {
    const ultima = await this.obtenerUltimaVersion(artefactoLogicoId);

    const lockVigente =
      ultima.lockedById &&
      ultima.lockedUntil &&
      ultima.lockedUntil.getTime() > Date.now();

    if (lockVigente && ultima.lockedById !== usuarioId) {
      throw new ConflictException(
        `El artefacto está siendo editado por otro usuario hasta ${ultima.lockedUntil!.toISOString()}.`,
      );
    }

    const lockedUntil = new Date(Date.now() + UX_ARTIFACT_LOCK_TTL_MS);

    return this.prisma.uxArtifact.update({
      where: { id: ultima.id },
      data: { lockedById: usuarioId, lockedUntil },
    });
  }

  /** Libera el lock manualmente (p. ej. el usuario cancela la edición). */
  async liberarLock(artefactoLogicoId: string, usuarioId: string) {
    const ultima = await this.obtenerUltimaVersion(artefactoLogicoId);

    if (ultima.lockedById && ultima.lockedById !== usuarioId) {
      throw new ForbiddenException('No puedes liberar el lock de otro usuario.');
    }

    return this.prisma.uxArtifact.update({
      where: { id: ultima.id },
      data: { lockedById: null, lockedUntil: null },
    });
  }

  /**
   * Guarda una nueva versión (INSERT, nunca UPDATE del contenido).
   * Requiere que `usuarioId` tenga el lock vigente sobre la última
   * versión — mismo mecanismo optimista-sobre-pesimista: si el lock
   * expiró o es de otro usuario, rechaza.
   */
  async guardarNuevaVersion(
    artefactoLogicoId: string,
    contenido: unknown,
    usuarioId: string,
  ) {
    const ultima = await this.obtenerUltimaVersion(artefactoLogicoId);

    const lockVigente =
      ultima.lockedById === usuarioId &&
      ultima.lockedUntil &&
      ultima.lockedUntil.getTime() > Date.now();

    if (!lockVigente) {
      throw new ConflictException(
        'No tienes el lock de edición vigente sobre este artefacto. Adquiérelo antes de guardar.',
      );
    }

    return this.prisma.uxArtifact.create({
      data: {
        tipo: ultima.tipo,
        proyectoId: ultima.proyectoId,
        artefactoLogicoId,
        version: ultima.version + 1,
        contenido: contenido as any,
        autorId: usuarioId,
        // La nueva versión nace sin lock; el lock anterior queda "muerto"
        // en la fila vieja y ya no se consulta (siempre miramos la última).
      },
    });
  }
}
