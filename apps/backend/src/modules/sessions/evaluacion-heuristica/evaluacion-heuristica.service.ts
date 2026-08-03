// Ubicación: src/modules/evaluacion-heuristica/evaluacion-heuristica.service.ts


import { Injectable, BadRequestException } from '@nestjs/common';
// import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EvaluacionHeuristicaService {
  // constructor(private prisma: PrismaService) {}

  crearSesion(proyectoId: string, usuarioId: string) {
    // TODO: Lógica Prisma para instanciar la evaluación
    return { proyectoId, usuarioId, estado: 'EN_PROGRESO' };
  }

  registrarHallazgo(sesionId: string, body: any, usuario: any) {
    // AUDITORÍA DE REGLAS DE NEGOCIO UX:
    // No se guarda si no hay heurística asignada
    if (!body.heuristicaId) {
      throw new BadRequestException('Es obligatorio asociar la heurística infringida para registrar el problema.');
    }
    
    // No se guarda si no hay nivel de severidad válido (0 al 4)
    if (body.severidad === undefined || body.severidad < 0 || body.severidad > 4) {
      throw new BadRequestException('El nivel de severidad es obligatorio y debe estar en la escala del 0 al 4.');
    }

    // TODO: Lógica Prisma para hacer un create/update (upsert) del problema de usabilidad, la evidencia y recomendaciones
    return { 
        sesionId, 
        hallazgo: body, 
        usuario,
        mensaje: 'Problema de usabilidad guardado exitosamente.'
    };
  }

  finalizarSesion(sesionId: string, usuario: any) {
    // TODO: Lógica Prisma para actualizar estado
    return { sesionId, usuario, estado: 'COMPLETADO' };
  }

  obtenerSesion(sesionId: string, usuario: any) {
    // TODO: Lógica Prisma para retornar la sesión agrupada por severidad
    return { sesionId, usuario };
  }
}