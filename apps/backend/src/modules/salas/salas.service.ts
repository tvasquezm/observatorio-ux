import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service'; // o tu ruta de prisma service
import { CreateSalaDto } from './dto/sala.dto';

@Injectable()
export class SalasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sala.findMany({
      include: { profesor: true },
    });
  }

  async create(createSalaDto: CreateSalaDto, userId?: string) {
    if (!userId) {
      throw new UnauthorizedException('No se encontró el usuario autenticado para crear la sala.');
    }

    return this.prisma.sala.create({
      data: {
        nombre: createSalaDto.nombre,
        periodo: createSalaDto.periodo,
        instrucciones: createSalaDto.instrucciones,
        profesor: {
          connect: { id: userId },
        },
      },
    });
  }
}