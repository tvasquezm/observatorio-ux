import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CardSortingService } from './card-sorting.service';
import {
  CreateCardSortingSessionDto,
  SubmitCardSortingResultDto,
} from './dto/card-sorting.dto';

// Importaciones corregidas apuntando a src/auth/
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
@Controller('card-sorting/sessions')
export class CardSortingController {
  constructor(private readonly cardSortingService: CardSortingService) {}

  // Nota: si en tu proyecto solo el "evaluador" autenticado puede crear
  // un estudio maestro, este endpoint también debería llevar @UseGuards(JwtAuthGuard)
  // y pasar user.id como evaluadorId al service.
  @Post()
  createSession(@Body() dto: CreateCardSortingSessionDto) {
    return this.cardSortingService.createSession(
      dto.proyectoId,
      dto.tarjetas,
      dto.categorias,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  joinSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.joinSession(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/results')
  submitResult(
    @Param('id') id: string,
    @Body() dto: SubmitCardSortingResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.submitResult(id, dto.grupos, user.id);
  }
}