import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TipoArtefacto } from '@prisma/client';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import {
  AcquireLockDto,
  CreateArtifactDto,
  CreateArtifactVersionDto,
} from './artifacts.dto';
import { ArtifactsService } from './artifacts.service';

@ApiTags('ux-artifacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:proyectoId/artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post()
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  create(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateArtifactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.create(proyectoId, dto, user);
  }

  @Get()
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  findAll(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Query('tipo') tipo: TipoArtefacto | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.findAll(proyectoId, tipo, user);
  }

  @Get(':artefactoId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  findOne(
    @Param('artefactoId', ParseUUIDPipe) artefactoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.findOne(artefactoId, user);
  }

  @Post(':artefactoId/versions')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  createVersion(
    @Param('artefactoId', ParseUUIDPipe) artefactoId: string,
    @Body() dto: CreateArtifactVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.createVersion(artefactoId, dto, user);
  }

  @Post(':artefactoId/lock')
  @ApiOperation({
    summary:
      'Adquiere (o renueva) el bloqueo pesimista sobre la última versión del artefacto.',
  })
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  acquireLock(
    @Param('artefactoId', ParseUUIDPipe) artefactoId: string,
    @Body() dto: AcquireLockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.acquireLock(artefactoId, user, dto.ttlSegundos);
  }

  @Delete(':artefactoId/lock')
  @ApiOperation({ summary: 'Libera el bloqueo pesimista del artefacto.' })
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  releaseLock(
    @Param('artefactoId', ParseUUIDPipe) artefactoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.releaseLock(artefactoId, user);
  }

  @Delete(':artefactoId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  @ApiOperation({
    summary:
      'Elimina el artefacto (soft delete: marca deletedAt en todas sus versiones, no borra filas).',
  })
  remove(
    @Param('artefactoId', ParseUUIDPipe) artefactoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.artifactsService.softDelete(artefactoId, user);
  }
}
