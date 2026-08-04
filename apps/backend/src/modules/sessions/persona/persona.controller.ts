// apps/backend/src/modules/artefactos/persona/persona.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PersonaService } from './persona.service';
import { CreatePersonaDto, UpdatePersonaDto } from './dto/persona.dto';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('artefactos/persona')
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Post()
  crear(@Body() dto: CreatePersonaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.personaService.crear(dto.proyectoId, dto.contenido, user.id);
  }

  @Get(':artefactoLogicoId')
  obtenerUltima(@Param('artefactoLogicoId') artefactoLogicoId: string) {
    return this.personaService.obtenerUltima(artefactoLogicoId);
  }

  @Get(':artefactoLogicoId/historial')
  obtenerHistorial(@Param('artefactoLogicoId') artefactoLogicoId: string) {
    return this.personaService.obtenerHistorial(artefactoLogicoId);
  }

  @Post(':artefactoLogicoId/lock')
  adquirirLock(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personaService.adquirirLock(artefactoLogicoId, user.id);
  }

  @Post(':artefactoLogicoId/unlock')
  liberarLock(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personaService.liberarLock(artefactoLogicoId, user.id);
  }

  // Requiere tener el lock vigente (ver PersonaService/UxArtifactService).
  @Post(':artefactoLogicoId/version')
  guardarNuevaVersion(
    @Param('artefactoLogicoId') artefactoLogicoId: string,
    @Body() dto: UpdatePersonaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personaService.guardarNuevaVersion(
      artefactoLogicoId,
      dto.contenido,
      user.id,
    );
  }
}
