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
} from '@observatorio-ux/shared-types'; // ajustar al alias real del monorepo
import { PrismaService } from '../../core/database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateArtifactDto, CreateArtifactVersionDto } from './artifacts.dto';

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

    if (artifact.lockedById && artifact.lockedById !== user.id) {
      const lockActive = artifact.lockedUntil && artifact.lockedUntil > new Date();
      if (lockActive) {
        throw new ConflictException('El artefacto está bloqueado por otro usuario.');
      }
    }

    // El tipo se hereda del artefacto lógico existente, no del DTO.
    this.validateContenidoByTipo(artifact.tipo, dto.contenido);

    const latest = await this.prisma.uxArtifact.findFirst({
      where: { artefactoLogicoId: artifact.artefactoLogicoId },
      orderBy: { version: 'desc' },
    });

    return this.prisma.uxArtifact.create({
      data: {
        proyectoId: artifact.proyectoId,
        tipo: artifact.tipo,
        artefactoLogicoId: artifact.artefactoLogicoId,
        version: (latest?.version ?? artifact.version) + 1,
        contenido: dto.contenido as Prisma.InputJsonValue,
        autorId: user.id,
      },
    });
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

      // Agregar más ramas a medida que se agreguen esquemas Zod para
      // otros valores de TipoArtefacto, ej:
      // case TipoArtefacto.PERSONA:
      //   this.parseOrThrow(PersonaSchema, contenido, 'Persona');
      //   break;

      default:
        // Tipos aún sin esquema estricto: no se valida (comportamiento actual).
        break;
    }
  }
}