import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { EstadoSesion } from '@prisma/client';
import {
  EVIDENCIA_MAX_BYTES,
  EVIDENCIA_MAX_POR_SESION,
} from '@observatorio-ux/shared-types';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica.service';
import { detectarMimeImagen } from './evidencia.util';

export interface ArchivoSubido {
  buffer: Buffer;
  size: number;
}

@Injectable()
export class HeuristicaEvidenciaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly heuristica: EvaluacionHeuristicaService,
  ) {}

  async subir(sesionId: string, archivo: ArchivoSubido | undefined, user: AuthenticatedUser) {
    // obtenerSesion valida existencia, tipo y propiedad (dueño o ADMIN).
    const sesion = await this.heuristica.obtenerSesion(sesionId, user);
    if (sesion.estado !== EstadoSesion.EN_PROGRESO) {
      throw new ConflictException('La sesión ya no está abierta para edición.');
    }
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('Adjunta una imagen en el campo "archivo".');
    }
    if (archivo.buffer.length > EVIDENCIA_MAX_BYTES) {
      throw new BadRequestException('La imagen supera el máximo de 2 MB.');
    }
    const mimeType = detectarMimeImagen(archivo.buffer);
    if (!mimeType) {
      throw new UnsupportedMediaTypeException('Formato no permitido. Usa PNG, JPEG o WebP.');
    }

    const existentes = await this.prisma.evidenciaHeuristica.count({ where: { sesionId } });
    if (existentes >= EVIDENCIA_MAX_POR_SESION) {
      throw new ConflictException(`Máximo ${EVIDENCIA_MAX_POR_SESION} capturas por sesión.`);
    }

    // Uint8Array.from copia a un ArrayBuffer propio (tipo exacto que espera Prisma Bytes).
    const creada = await this.prisma.evidenciaHeuristica.create({
      data: {
        sesionId,
        subidoPorId: user.id,
        mimeType,
        tamano: archivo.buffer.length,
        datos: Uint8Array.from(archivo.buffer),
      },
      select: { id: true, mimeType: true, tamano: true, createdAt: true },
    });
    return creada;
  }

  async obtener(sesionId: string, evidenciaId: string, user: AuthenticatedUser) {
    await this.heuristica.obtenerSesion(sesionId, user);
    const evidencia = await this.prisma.evidenciaHeuristica.findFirst({
      where: { id: evidenciaId, sesionId },
      select: { mimeType: true, datos: true },
    });
    if (!evidencia) throw new NotFoundException('La evidencia no existe.');
    return { mimeType: evidencia.mimeType, datos: Buffer.from(evidencia.datos) };
  }
}
