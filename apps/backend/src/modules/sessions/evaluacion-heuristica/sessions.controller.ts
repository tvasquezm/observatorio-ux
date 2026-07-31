import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
// import { RolesGuard } from '../../../core/guards/roles.guard';

// import { Roles } from '../../../core/decorators/roles.decorator';
// import { CurrentUser } from '../../../core/decorators/current-user.decorator';

//import { Rol } from '@prisma/client';

import { SessionsService } from './sessions.service';

@ApiTags('evaluacion-heuristica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proyectos/:proyectoId/evaluacion-heuristica/sesiones')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Post()
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({
    summary: 'Abre una nueva sesión de evaluación heurística',
  })
  crear(@Param('proyectoId') proyectoId: string) {
    return this.service.crearSesion(
      proyectoId,
      'usuario-temporal',
    );
  }

  @Patch(':sesionId')
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({
    summary: 'Autoguardado parcial',
  })
  actualizarParcial(
    @Param('sesionId') sesionId: string,
    @Body() body: unknown,
  ) {
    return this.service.actualizarParcial(
      sesionId,
      body,
      {
        id: 'usuario-temporal',
        rol: 'ESTUDIANTE',
      },
    );
  }

  @Post(':sesionId/finalizar')
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({
    summary: 'Finaliza una sesión',
  })
  finalizar(
    @Param('sesionId') sesionId: string,
  ) {
    return this.service.finalizar(
      sesionId,
      {
        id: 'usuario-temporal',
        rol: 'ESTUDIANTE',
      },
    );
  }

  @Get(':sesionId')
  // @Roles(Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN)
  @ApiOperation({
    summary: 'Obtiene una sesión',
  })
  obtener(
    @Param('sesionId') sesionId: string,
  ) {
    return this.service.obtenerSesion(
      sesionId,
      {
        id: 'usuario-temporal',
        rol: 'ESTUDIANTE',
      },
    );
  }
}