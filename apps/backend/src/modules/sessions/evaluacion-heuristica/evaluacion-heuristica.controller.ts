// Ubicación: src/modules/sessions/evaluacion-heuristica/evaluacion-heuristica.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator'; // <-- Importamos el decorador
import { EvaluacionHeuristicaService } from './evaluacion-heuristica.service';
import { HeuristicaDto } from './dto/heuristica.dto';

@ApiTags('evaluacion-heuristica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proyectos/:proyectoId/evaluacion-heuristica/sesiones')
export class EvaluacionHeuristicaController {
  constructor(private readonly heuristicaService: EvaluacionHeuristicaService) {}

  @Post()
  @ApiOperation({ summary: 'Abre una nueva sesión de evaluación heurística' })
  crear(
    @Param('proyectoId') proyectoId: string,
    @CurrentUser() usuario: any, 
  ) {
    // Imprimimos en consola qué nos está entregando el decorador
    console.log('Objeto usuario detectado:', usuario); 
    
    // El ? evita que explote. Si no hay ID, mandamos un error claro en vez de un 500
    if (!usuario?.id) {
      throw new BadRequestException('No se pudo extraer el ID del usuario desde el token.');
    }

    return this.heuristicaService.crearSesion(proyectoId, usuario.id);
  }

  @Patch(':sesionId/hallazgos')
  @ApiOperation({ summary: 'Registra o actualiza un problema de usabilidad' })
  actualizarParcial(
    @Param('sesionId') sesionId: string,
    @Body() body: HeuristicaDto,
    @CurrentUser() usuario: any,
  ) {
    return this.heuristicaService.registrarHallazgo(sesionId, body, usuario);
  }

  @Post(':sesionId/finalizar')
  @ApiOperation({ summary: 'Finaliza la sesión de evaluación' })
  finalizar(
    @Param('sesionId') sesionId: string,
    @CurrentUser() usuario: any,
  ) {
    return this.heuristicaService.finalizarSesion(sesionId, usuario);
  }

  @Get(':sesionId')
  @ApiOperation({ summary: 'Obtiene el detalle y hallazgos de una sesión' })
  obtener(
    @Param('sesionId') sesionId: string,
    @CurrentUser() usuario: any,
  ) {
    return this.heuristicaService.obtenerSesion(sesionId, usuario);
  }
}