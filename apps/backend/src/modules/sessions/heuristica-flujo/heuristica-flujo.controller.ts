import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { EVIDENCIA_MAX_BYTES } from '@observatorio-ux/shared-types';
import type { Response } from 'express';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface.js';
import type { ArchivoSubido } from '../evaluacion-heuristica/heuristica-evidencia.service.js';
import { HeuristicaFlujoService } from './heuristica-flujo.service.js';

@ApiTags('heuristica-flujo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
@Controller('projects/:proyectoId/evaluacion-heuristica')
export class HeuristicaFlujoController {
  constructor(private readonly service: HeuristicaFlujoService) {}

  @Get('equipo')
  equipo(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.equipo(proyectoId, user);
  }
  @Get('metodologias')
  metodologias(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.metodologias(proyectoId, user);
  }
  @Post('metodologias')
  guardarMetodologia(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.guardarMetodologia(proyectoId, body, user);
  }
  @Get('evaluaciones')
  listar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listar(proyectoId, user);
  }
  @Post('evaluaciones')
  crear(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.crear(proyectoId, body, user);
  }
  @Get('evaluaciones/:id')
  obtener(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.obtener(proyectoId, id, user);
  }
  @Patch('evaluaciones/:id/configuracion')
  configuracion(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.configuracion(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/iniciar')
  iniciar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.iniciar(proyectoId, id, body, user);
  }
  @Patch('evaluaciones/:id/trabajo')
  guardarTrabajo(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.guardarTrabajo(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/entregar')
  entregar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.entregar(proyectoId, id, body, user);
  }
  @Patch('evaluaciones/:id/consenso')
  guardarConsenso(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.guardarConsenso(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/aprobar')
  aprobar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.aprobar(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/consolidar')
  consolidar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.consolidar(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/finalizar')
  finalizar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.finalizar(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/version')
  version(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.version(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/evidencias')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: EVIDENCIA_MAX_BYTES, files: 1, fields: 0 } }))
  subir(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() archivo: ArchivoSubido | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.subirEvidencia(proyectoId, id, archivo, user);
  }
  @Get('evaluaciones/:id/evidencias/:evidenciaId/meta')
  meta(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Param('evidenciaId', ParseUUIDPipe) evidenciaId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.obtenerEvidencia(proyectoId, id, evidenciaId, user, true);
  }
  @Get('evaluaciones/:id/evidencias/:evidenciaId')
  async captura(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Param('evidenciaId', ParseUUIDPipe) evidenciaId: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const evidencia = await this.service.obtenerEvidencia(proyectoId, id, evidenciaId, user);
    if ('datos' in evidencia) res.status(200).set({ 'Content-Type': evidencia.mimeType, 'Content-Length': String(evidencia.datos.length), 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline; filename="evidencia"' }).send(evidencia.datos);
  }
  @Patch('evaluaciones/:id/evidencias/:evidenciaId')
  anotar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Param('evidenciaId', ParseUUIDPipe) evidenciaId: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.anotarEvidencia(proyectoId, id, evidenciaId, body, user);
  }
  @Get('evaluaciones/:id/comparacion/:previaId')
  comparacion(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Param('previaId', ParseUUIDPipe) previaId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.comparacion(proyectoId, id, previaId, user);
  }
  @Patch('evaluaciones/:id/comparacion')
  guardarComparacion(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.guardarComparacion(proyectoId, id, body, user);
  }
}
