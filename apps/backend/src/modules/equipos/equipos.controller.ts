import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { EquiposService } from './equipos.service';
import { AddMiembroEquipoDto, CreateEquipoDto, UpdateEquipoDto } from './equipos.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salas/:salaId/equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Post()
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  create(
    @Param('salaId', ParseUUIDPipe) salaId: string,
    @Body() dto: CreateEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equiposService.create(salaId, dto, user);
  }

  @Get()
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  findAll(
    @Param('salaId', ParseUUIDPipe) salaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equiposService.findAll(salaId, user);
  }

  @Get(':equipoId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  findOne(
    @Param('salaId', ParseUUIDPipe) salaId: string,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equiposService.findOne(salaId, equipoId, user);
  }

  @Patch(':equipoId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  update(
    @Param('salaId', ParseUUIDPipe) salaId: string,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
    @Body() dto: UpdateEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equiposService.update(salaId, equipoId, dto, user);
  }

  @Delete(':equipoId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  remove(
    @Param('salaId', ParseUUIDPipe) salaId: string,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equiposService.remove(salaId, equipoId, user);
  }

  @Post(':equipoId/miembros')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  addMiembro(
    @Param('salaId', ParseUUIDPipe) salaId: string,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
    @Body() dto: AddMiembroEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equiposService.addMiembro(salaId, equipoId, dto, user);
  }

  @Delete(':equipoId/miembros/:usuarioId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  removeMiembro(
    @Param('salaId', ParseUUIDPipe) salaId: string,
    @Param('equipoId', ParseUUIDPipe) equipoId: string,
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equiposService.removeMiembro(salaId, equipoId, usuarioId, user);
  }
}
