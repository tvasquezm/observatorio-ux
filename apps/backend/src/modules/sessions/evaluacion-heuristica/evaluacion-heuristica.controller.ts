// Ubicación: src/modules/evaluacion-heuristica/evaluacion-heuristica.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
// import { RolesGuard } from '../../../core/guards/roles.guard';
// import { Roles } from '../../../core/decorators/roles.decorator';
// import { CurrentUser } from '../../../core/decorators/current-user.decorator';
// import { Rol } from '@prisma/client';

import { EvaluacionHeuristicaService } from './evaluacion-heuristica.service';

@ApiTags('evaluacion-heuristica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proyectos/:proyectoId/evaluacion-heuristica/sesiones')
export class EvaluacionHeuristicaController {
  constructor(private readonly heuristicaService: EvaluacionHeuristicaService) {}

  @Post()
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({ summary: 'Abre una nueva sesión de evaluación heurística' })
  crear(@Param('proyectoId') proyectoId: string) {
    return this.heuristicaService.crearSesion(
      proyectoId,
      'usuario-temporal', // TODO: Reemplazar con @CurrentUser()
    );
  }

  @Patch(':sesionId/hallazgos')
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({ summary: 'Registra o actualiza un problema de usabilidad' })
  actualizarParcial(
    @Param('sesionId') sesionId: string,
    @Body() body: any, // TODO: Crear y usar un DTO (ej: RegistrarHallazgoDto)
  ) {
    return this.heuristicaService.registrarHallazgo(
      sesionId,
      body,
      {
        id: 'usuario-temporal',
        rol: 'ESTUDIANTE',
      },
    );
  }

  @Post(':sesionId/finalizar')
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({ summary: 'Finaliza la sesión de evaluación' })
  finalizar(@Param('sesionId') sesionId: string) {
    return this.heuristicaService.finalizarSesion(
      sesionId,
      {
        id: 'usuario-temporal',
        rol: 'ESTUDIANTE',
      },
    );
  }

  @Get(':sesionId')
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({ summary: 'Obtiene el detalle y hallazgos de una sesión' })
  obtener(@Param('sesionId') sesionId: string) {
    return this.heuristicaService.obtenerSesion(
      sesionId,
      {
        id: 'usuario-temporal',
        rol: 'ESTUDIANTE',
      },
    );
  }
}