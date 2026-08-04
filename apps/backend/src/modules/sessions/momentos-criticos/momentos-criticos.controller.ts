// apps/backend/src/modules/artefactos/momentos-criticos/momentos-criticos.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MomentosCriticosService } from './momentos-criticos.service';
import {
  CreateMomentosCriticosDto,
  UpdateMomentosCriticosDto,
} from './dto/momentos-criticos.dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('artefactos/momentos-criticos')
export class MomentosCriticosController {
  constructor(private readonly momentosCriticosService: MomentosCriticosService) {}

  @Post()
  crear(
    @Body() dto: CreateMomentosCriticosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.momentosCriticosService.crear(dto.proyectoId, dto.contenido, user.id);
  }

  @Get(':artefactoLogicoId')
  obtenerUltima(@Param('artefactoLogicoId') artefactoLogicoId: string) {
    return this.momentosCriticosService.obtenerUltima(artefactoLogicoId);
  }

  @Get(':artefactoLogicoId/historial')
  obtenerHistorial(@Param('artefactoLogicoId') artefactoLogicoId: string) {
    return this.momentosCriticosService.obtenerHistorial(artefactoLogicoId);
  }

  @Post(':artefactoLogicoId/lock')
  adquirirLock(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.momentosCriticosService.adquirirLock(artefactoLogicoId, user.id);
  }

  @Post(':artefactoLogicoId/unlock')
  liberarLock(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.momentosCriticosService.liberarLock(artefactoLogicoId, user.id);
  }

  @Post(':artefactoLogicoId/version')
  guardarNuevaVersion(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @Body() dto: UpdateMomentosCriticosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.momentosCriticosService.guardarNuevaVersion(
      artefactoLogicoId,
      dto.contenido,
      user.id,
    );
  }
}
