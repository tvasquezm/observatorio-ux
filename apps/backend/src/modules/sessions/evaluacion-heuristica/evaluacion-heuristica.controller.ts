import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface.js';
import { HeuristicaDto } from './dto/heuristica.dto.js';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica.service.js';

@ApiTags('evaluacion-heuristica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
@Controller('projects/:proyectoId/evaluacion-heuristica/sesiones')
export class EvaluacionHeuristicaController {
  constructor(private readonly service: EvaluacionHeuristicaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las evaluaciones accesibles para el informe del proyecto' })
  listar(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.listarSesiones(proyectoId, user);
  }

  @Post()
  @ApiOperation({ summary: 'Abre una sesión de evaluación heurística' })
  crear(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.crearSesion(proyectoId, user);
  }

  @Patch(':sesionId/hallazgos')
  @ApiOperation({ summary: 'Registra un hallazgo de usabilidad' })
  actualizarParcial(
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Body() body: HeuristicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.registrarHallazgo(sesionId, body, user);
  }

  @Post(':sesionId/finalizar')
  @ApiOperation({ summary: 'Finaliza una sesión de evaluación' })
  finalizar(
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.finalizarSesion(sesionId, user);
  }

  @Get(':sesionId')
  @ApiOperation({ summary: 'Obtiene una sesión y sus hallazgos' })
  obtener(
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.obtenerSesion(sesionId, user);
  }
}

@ApiTags('evaluacion-heuristica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
@Controller('projects/:proyectoId/evaluacion-heuristica/analytics')
export class EvaluacionHeuristicaAnalyticsController {
  constructor(private readonly service: EvaluacionHeuristicaService) {}

  @Get()
  @ApiOperation({ summary: 'Distribución de severidad agregada del proyecto' })
  obtenerAnalitica(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.obtenerAnalitica(proyectoId, user);
  }
}
