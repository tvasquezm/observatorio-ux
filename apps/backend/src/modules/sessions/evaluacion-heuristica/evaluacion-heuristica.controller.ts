import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EVIDENCIA_MAX_BYTES } from '@observatorio-ux/shared-types';
import type { Response } from 'express';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import {
  ActualizarHallazgoDto,
  CrearSesionHeuristicaDto,
  HeuristicaDto,
} from './dto/heuristica.dto';
import { EvaluacionHeuristicaService } from './evaluacion-heuristica.service';
import { ArchivoSubido, HeuristicaEvidenciaService } from './heuristica-evidencia.service';

@ApiTags('evaluacion-heuristica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
@Controller('projects/:proyectoId/evaluacion-heuristica/sesiones')
export class EvaluacionHeuristicaController {
  constructor(
    private readonly service: EvaluacionHeuristicaService,
    private readonly evidencias: HeuristicaEvidenciaService,
  ) {}

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
    @Body() body: CrearSesionHeuristicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.crearSesion(proyectoId, body, user);
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

  @Patch(':sesionId/hallazgos/:hallazgoId')
  @ApiOperation({ summary: 'Edita un hallazgo (sesión en progreso)' })
  editarHallazgo(
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Param('hallazgoId', ParseUUIDPipe) hallazgoId: string,
    @Body() body: ActualizarHallazgoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.actualizarHallazgo(sesionId, hallazgoId, body, user);
  }

  @Delete(':sesionId/hallazgos/:hallazgoId')
  @ApiOperation({ summary: 'Elimina un hallazgo (sesión en progreso)' })
  eliminarHallazgo(
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Param('hallazgoId', ParseUUIDPipe) hallazgoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.eliminarHallazgo(sesionId, hallazgoId, user);
  }

  @Post(':sesionId/evidencias')
  @ApiOperation({ summary: 'Sube una captura de pantalla (PNG/JPEG/WebP, máx. 2 MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: EVIDENCIA_MAX_BYTES, files: 1 } }),
  )
  subirEvidencia(
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evidencias.subir(sesionId, archivo, user);
  }

  @Get(':sesionId/evidencias/:evidenciaId')
  @ApiOperation({ summary: 'Descarga una captura de pantalla de la sesión' })
  async obtenerEvidencia(
    @Param('sesionId', ParseUUIDPipe) sesionId: string,
    @Param('evidenciaId', ParseUUIDPipe) evidenciaId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { mimeType, datos } = await this.evidencias.obtener(sesionId, evidenciaId, user);
    res
      .status(200)
      .set({
        'Content-Type': mimeType,
        'Content-Length': String(datos.length),
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline; filename="evidencia"',
      })
      .send(datos);
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
