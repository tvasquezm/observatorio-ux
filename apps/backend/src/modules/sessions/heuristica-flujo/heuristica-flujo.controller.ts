import { Body, Controller, Delete, Get, Header, HttpCode, MessageEvent, Param, ParseUUIDPipe, Patch, Post, Res, Sse, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Observable, filter, interval, map, merge } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { EVIDENCIA_MAX_BYTES } from '@observatorio-ux/shared-types';
import type { Response } from 'express';
import { CurrentUser } from '../../../core/decorators/current-user.decorator.js';
import { Roles } from '../../../core/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../core/guards/roles.guard.js';
import { SoloLecturaDocenteGuard } from '../../../core/guards/solo-lectura-docente.guard.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface.js';
import type { ArchivoSubido } from './evidencia.util.js';
import { HeuristicaFlujoService } from './heuristica-flujo.service.js';
import { cambiosDeEvaluacion } from './evaluacion-eventos.js';

@ApiTags('heuristica-flujo')
@ApiBearerAuth()
// El docente consulta (GET); crear, guardar, entregar o votar lo hacen los estudiantes.
@UseGuards(JwtAuthGuard, RolesGuard, SoloLecturaDocenteGuard)
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
  @Patch('metodologias/:id')
  actualizarMetodologia(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.actualizarMetodologia(proyectoId, id, body, user);
  }
  @Delete('metodologias/:id')
  @HttpCode(204)
  async borrarMetodologia(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.service.borrarMetodologia(proyectoId, id, user);
  }
  @Get('evaluaciones')
  listar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listar(proyectoId, user);
  }
  @Post('evaluaciones')
  crear(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.crear(proyectoId, body, user);
  }
  @Post('evaluaciones/comenzar')
  comenzar(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.comenzar(proyectoId, body, user);
  }
  /**
   * Avisos de una evaluación abierta: cambios de fase y avances del equipo (el contenido se pide aparte, con los permisos de cada persona).
   * El latido evita que proxies o el hosting corten la conexión por inactividad.
   */
  @Sse('evaluaciones/:id/eventos')
  @Header('X-Accel-Buffering', 'no')
  async eventos(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Observable<MessageEvent>> {
    await this.service.verificarAcceso(proyectoId, user);
    return merge(
      cambiosDeEvaluacion.pipe(filter(c => c.id === id), map((c): MessageEvent => ({ type: c.tipo, data: { fase: c.fase, revision: c.revision } }))),
      interval(25_000).pipe(map((): MessageEvent => ({ type: 'latido', data: 'ok' }))),
    );
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
  @Post('evaluaciones/:id/consenso/aportes')
  agregarAporte(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.agregarAporte(proyectoId, id, body, user);
  }
  @Delete('evaluaciones/:id/consenso/aportes/:aporteId')
  quitarAporte(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Param('aporteId') aporteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.quitarAporte(proyectoId, id, aporteId.slice(0, 150), user);
  }
  @Post('evaluaciones/:id/consenso/aportes-positivos')
  agregarAportePositivo(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.agregarAportePositivo(proyectoId, id, body, user);
  }
  @Delete('evaluaciones/:id/consenso/aportes-positivos/:aporteId')
  quitarAportePositivo(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Param('aporteId') aporteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.quitarAportePositivo(proyectoId, id, aporteId.slice(0, 150), user);
  }
  @Post('evaluaciones/:id/redactor/voto')
  votarRedactor(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.votarRedactor(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/redactor/decidir')
  decidirRedactor(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.decidirRedactor(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/pedir-cambios')
  pedirCambios(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.pedirCambios(proyectoId, id, body, user);
  }
  @Post('evaluaciones/:id/entregar-acuerdo')
  entregarAcuerdo(@Param('proyectoId', ParseUUIDPipe) proyectoId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.service.entregarAcuerdo(proyectoId, id, body, user);
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
