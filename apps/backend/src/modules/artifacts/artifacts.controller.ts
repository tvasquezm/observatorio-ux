import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, filter, interval, map, merge } from 'rxjs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TipoArtefacto } from '../../generated/prisma/client.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface.js';
import {
  AcquireLockDto,
  CreateArtifactDto,
  CreateArtifactVersionDto,
} from './artifacts.dto.js';
import { ArtifactsService } from './artifacts.service.js';
import { cambiosDeArtefactos } from './artifacts-eventos.js';

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

  /**
   * Avisos de cambios en los artefactos del proyecto (bloqueo de edición, versión nueva, creado, eliminado).
   * Va antes de `:artefactoId` para que «eventos» no se tome por un id. El latido evita cortes por inactividad.
   */
  @Sse('eventos')
  @Header('X-Accel-Buffering', 'no')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  async eventos(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Observable<MessageEvent>> {
    await this.artifactsService.verificarAcceso(proyectoId, user);
    return merge(
      cambiosDeArtefactos.pipe(
        filter((c) => c.proyectoId === proyectoId),
        map((c): MessageEvent => ({ type: c.tipo, data: { usuarioId: c.usuarioId } })),
      ),
      interval(25_000).pipe(map((): MessageEvent => ({ type: 'latido', data: 'ok' }))),
    );
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
