import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { SalasService } from './salas.service';
import {
  BulkCreateSalaEstudiantesDto,
  CreateProyectoEnSalaDto,
  CreateSalaDto,
  CreateSalaEstudianteDto,
  UpdateSalaDto,
  UpdateSalaEstudianteDto,
} from './dto/sala.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Get()
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.salasService.findAll(user);
  }

  @Get(':id')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.findOne(id, user);
  }

  @Post()
  @Roles('DOCENTE', 'ADMIN')
  async create(@Body() createSalaDto: CreateSalaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salasService.create(createSalaDto, user.id);
  }

  @Patch(':id')
  @Roles('DOCENTE', 'ADMIN')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSalaDto: UpdateSalaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.update(id, updateSalaDto, user);
  }

  // ---------------------------------------------------------------
  // Estudiantes
  // ---------------------------------------------------------------

  @Get(':id/estudiantes')
  @Roles('DOCENTE', 'ADMIN')
  listEstudiantes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.listEstudiantes(id, user);
  }

  @Post(':id/estudiantes')
  @Roles('DOCENTE', 'ADMIN')
  addEstudiante(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSalaEstudianteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.addEstudiante(id, dto, user);
  }

  @Post(':id/estudiantes/bulk')
  @Roles('DOCENTE', 'ADMIN')
  addEstudiantesBulk(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkCreateSalaEstudiantesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.addEstudiantesBulk(id, dto, user);
  }

  @Patch(':id/estudiantes/:estudianteId')
  @Roles('DOCENTE', 'ADMIN')
  updateEstudiante(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('estudianteId', ParseUUIDPipe) estudianteId: string,
    @Body() dto: UpdateSalaEstudianteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.updateEstudiante(id, estudianteId, dto, user);
  }

  @Delete(':id/estudiantes/:estudianteId')
  @Roles('DOCENTE', 'ADMIN')
  removeEstudiante(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('estudianteId', ParseUUIDPipe) estudianteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.removeEstudiante(id, estudianteId, user);
  }

  // ---------------------------------------------------------------
  // Proyectos alojados en la sala
  // ---------------------------------------------------------------

  @Get(':id/proyectos')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  listProyectos(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.listProyectos(id, user);
  }

  @Post(':id/proyectos')
  @Roles('DOCENTE', 'ADMIN')
  createProyectoEnSala(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProyectoEnSalaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.createProyectoEnSala(id, dto, user);
  }

  @Post(':id/proyectos/:proyectoId/vincular')
  @Roles('DOCENTE', 'ADMIN')
  vincularProyecto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.vincularProyecto(id, proyectoId, user);
  }

  @Delete(':id/proyectos/:proyectoId')
  @Roles('DOCENTE', 'ADMIN')
  desvincularProyecto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salasService.desvincularProyecto(id, proyectoId, user);
  }
}
