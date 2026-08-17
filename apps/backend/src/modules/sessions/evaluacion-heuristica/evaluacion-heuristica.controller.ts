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
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import { HeuristicaDto } from './dto/heuristica.dto';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica.service';

@ApiTags('evaluacion-heuristica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
@Controller('proyectos/:proyectoId/evaluacion-heuristica/sesiones')
export class EvaluacionHeuristicaController {
  constructor(private readonly service: EvaluacionHeuristicaService) {}

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
