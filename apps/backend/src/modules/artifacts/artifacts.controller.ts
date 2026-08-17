import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TipoArtefacto } from '@prisma/client';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateArtifactDto, CreateArtifactVersionDto } from './artifacts.dto';
import { ArtifactsService } from './artifacts.service';

@ApiTags('ux-artifacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
@Controller([
  'projects/:proyectoId/artifacts',
  'proyectos/:proyectoId/artefactos',
])
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post()
  create(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateArtifactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.create(proyectoId, dto, user);
  }

  @Get()
  findAll(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Query('tipo') tipo: TipoArtefacto | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.findAll(proyectoId, tipo, user);
  }

  @Get(':artefactoId')
  findOne(
    @Param('artefactoId', ParseUUIDPipe) artefactoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.findOne(artefactoId, user);
  }

  @Post(':artefactoId/versions')
  createVersion(
    @Param('artefactoId', ParseUUIDPipe) artefactoId: string,
    @Body() dto: CreateArtifactVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.createVersion(artefactoId, dto, user);
  }
}
