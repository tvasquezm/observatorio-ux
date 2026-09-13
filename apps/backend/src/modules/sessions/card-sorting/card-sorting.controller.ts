import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { JwtParticipanteGuard } from '../../../core/guards/jwt-participante.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import {
  CreateCardSortingSessionDto,
  SubmitCardSortingResultDto,
  CerrarEstudioDto,
} from './dto/card-sorting.dto';
import { CardSortingService } from './card-sorting.service';

@ApiTags('card-sorting')
@ApiBearerAuth()
@Controller('card-sorting/sessions')
export class CardSortingController {
  constructor(private readonly cardSortingService: CardSortingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  createSession(
    @Body() dto: CreateCardSortingSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.createSession(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  findByProyecto(
    @Query('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.findByProyecto(proyectoId, user);
  }

  // Lo consulta tanto el EVALUADOR (cookie evaluadorToken) como el
  // PARTICIPANTE (Bearer participanteToken) — dos estrategias distintas,
  // la primera que valide gana (ver jwt.strategy.ts / jwt-participante.strategy.ts).
  // Todos los estudios maestros del proyecto (no solo el más reciente).
  // Se declara antes de ':id' para no competir con esa ruta de un solo
  // segmento (acá son 3 segmentos: proyecto/:proyectoId/todos).
  @Get('proyecto/:proyectoId/todos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  findAllByProyecto(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.findAllByProyecto(proyectoId, user);
  }

  @Get(':id')
  @UseGuards(AuthGuard(['jwt', 'jwt-participante']), RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN', 'PARTICIPANTE')
  getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.getSession(id, user);
  }

  @Patch(':id/cerrar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  cerrarEstudio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CerrarEstudioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.cerrarEstudio(id, dto.cerrado, user);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.getAnalytics(id, user);
  }

  @Post(':id/join')
  @UseGuards(JwtParticipanteGuard, RolesGuard)
  @Roles('PARTICIPANTE')
  joinSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.joinSession(id, user);
  }

  @Post(':id/results')
  @UseGuards(JwtParticipanteGuard, RolesGuard)
  @Roles('PARTICIPANTE')
  submitResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitCardSortingResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.submitResult(id, dto.grupos, user);
  }
}

