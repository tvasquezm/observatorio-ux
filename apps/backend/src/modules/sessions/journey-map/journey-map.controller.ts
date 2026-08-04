// apps/backend/src/modules/artefactos/journey-map/journey-map.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JourneyMapService } from './journey-map.service';
import { CreateJourneyMapDto, UpdateJourneyMapDto } from './dto/journey-map.dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('artefactos/journey-map')
export class JourneyMapController {
  constructor(private readonly journeyMapService: JourneyMapService) {}

  @Post()
  crear(@Body() dto: CreateJourneyMapDto, @CurrentUser() user: AuthenticatedUser) {
    return this.journeyMapService.crear(dto.proyectoId, dto.contenido, user.id);
  }

  @Get(':artefactoLogicoId')
  obtenerUltima(@Param('artefactoLogicoId') artefactoLogicoId: string) {
    return this.journeyMapService.obtenerUltima(artefactoLogicoId);
  }

  @Get(':artefactoLogicoId/historial')
  obtenerHistorial(@Param('artefactoLogicoId') artefactoLogicoId: string) {
    return this.journeyMapService.obtenerHistorial(artefactoLogicoId);
  }

  @Post(':artefactoLogicoId/lock')
  adquirirLock(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journeyMapService.adquirirLock(artefactoLogicoId, user.id);
  }

  @Post(':artefactoLogicoId/unlock')
  liberarLock(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journeyMapService.liberarLock(artefactoLogicoId, user.id);
  }

  @Post(':artefactoLogicoId/version')
  guardarNuevaVersion(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @Body() dto: UpdateJourneyMapDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journeyMapService.guardarNuevaVersion(
      artefactoLogicoId,
      dto.contenido,
      user.id,
    );
  }
}
