// src/modules/sessions/evaluacion-heuristica/evaluacion-heuristica.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service'; 
import * as crypto from 'crypto'; 

@Injectable()
export class EvaluacionHeuristicaService {
  constructor(private prisma: PrismaService) {}

  async crearSesion(proyectoId: string, usuarioId: string) {
  const nuevaSesion = await this.prisma.researchSession.create({
    data: {
      proyecto: { connect: { id: proyectoId } },
      evaluador: { connect: { id: usuarioId } },
      tipo: 'EVALUACION_HEURISTICA',
      estado: 'EN_PROGRESO',
      actor: 'EVALUADOR',
    },
  });
  return nuevaSesion;
}

  async registrarHallazgo(sesionId: string, body: any, usuario: any) {
    const sesion = await this.prisma.researchSession.findUnique({
      where: { id: sesionId }
    });

    if (!sesion) {
      throw new NotFoundException('La sesión de evaluación no existe.');
    }

    const hallazgosActuales = (sesion.resultado as any[]) || [];

    const nuevoHallazgo = {
      id: crypto.randomUUID(), 
      heuristicaId: body.heuristicaId,
      severidad: body.severidad,
      descripcion: body.descripcion,
      evidencia: body.evidencia || null,
      recomendacion: body.recomendacion || null,
      registradoEn: new Date().toISOString(),
    };

    hallazgosActuales.push(nuevoHallazgo);

    await this.prisma.researchSession.update({
      where: { id: sesionId },
      data: {
        resultado: hallazgosActuales
      }
    });

    return { 
        mensaje: 'Problema de usabilidad registrado con éxito.',
        hallazgo: nuevoHallazgo
    };
  }

  async finalizarSesion(sesionId: string, usuario: any) {
    const sesionFinalizada = await this.prisma.researchSession.update({
      where: { id: sesionId },
      data: {
        estado: 'COMPLETADO',
        completadoAt: new Date(),
      },
    });

    return sesionFinalizada;
  }

  async obtenerSesion(sesionId: string, usuario: any) {
    const sesion = await this.prisma.researchSession.findUnique({
      where: { id: sesionId },
    });

    if (!sesion) {
      throw new NotFoundException('La sesión de evaluación no existe.');
    }

    return sesion;
  }
}