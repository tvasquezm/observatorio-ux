import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { JwtAnyActorGuard } from '../../../core/guards/jwt-any-actor.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import {
  CreateCardSortingSessionDto,
  SubmitCardSortingResultDto,
} from './dto/card-sorting.dto';
import { CardSortingService } from './card-sorting.service';

@ApiTags('card-sorting')
@ApiBearerAuth()
@Controller('card-sorting/sessions')
export class CardSortingController {
  constructor(private readonly cardSortingService: CardSortingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // Doc maestro "Flujos de Usuarios" — Seleccionar y aplicar técnicas:
  // Profesor = Consulta (no gestiona). Antes incluía DOCENTE acá pero no
  // en @Roles('ESTUDIANTE') de closeStudy/createShareLink/
  // submitEvaluatorResult — un DOCENTE podía crear una técnica que
  // después nadie podía cerrar, compartir ni aplicar. Se saca DOCENTE de
  // los tres lados para que quede consistente.
  @Roles('ESTUDIANTE', 'ADMIN')
  createSession(
    @Body() dto: CreateCardSortingSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.createSession(dto, user);
  }

  // Estas rutas deben declararse antes de `:id` para que `public` no sea
  // interpretado como un UUID por ParseUUIDPipe.
  @Get('project/:projectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  listStudies(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.listStudies(projectId, user);
  }

  @Get('public/:token')
  getPublicStudy(@Param('token') token: string) {
    return this.cardSortingService.getPublicStudy(token);
  }

  @Post('public/:token/join')
  joinPublicStudy(@Param('token') token: string) {
    return this.cardSortingService.joinPublicStudy(token);
  }

  @Get(':id')
  @UseGuards(JwtAnyActorGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN', 'PARTICIPANTE')
  getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.getSession(id, user);
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

  @Post(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'ADMIN')
  closeStudy(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cardSortingService.closeStudy(id, user);
  }

  @Post(':id/share-link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'ADMIN')
  createShareLink(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.createShareLink(id, user);
  }

  @Post(':id/self-results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'ADMIN')
  submitSelfResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitCardSortingResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.submitEvaluatorResult(id, dto.grupos, user);
  }

  @Post(':id/join')
  @UseGuards(JwtAnyActorGuard, RolesGuard)
  @Roles('PARTICIPANTE')
  joinSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.joinSession(id, user);
  }

  @Post(':id/results')
  @UseGuards(JwtAnyActorGuard, RolesGuard)
  @Roles('PARTICIPANTE')
  submitResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitCardSortingResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.submitResult(id, dto.grupos, user);
  }
}
