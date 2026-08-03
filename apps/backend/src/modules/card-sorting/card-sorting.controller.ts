import { Controller, Post, Body, Param } from '@nestjs/common';
import { CardSortingService } from './card-sorting.service';
import { 
  CreateCardSortingSessionDto, 
  JoinCardSortingSessionDto, 
  SubmitCardSortingResultDto 
} from './dto/card-sorting.dto';

// Fíjate que le quitamos el "api/" al decorador
@Controller('card-sorting/sessions')
export class CardSortingController {
  constructor(private readonly cardSortingService: CardSortingService) {}

  @Post()
  createSession(@Body() dto: CreateCardSortingSessionDto) {
    return this.cardSortingService.createSession(
      dto.proyectoId,
      dto.tarjetas,
      dto.categorias
    );
  }

  @Post(':id/join')
  joinSession(@Param('id') id: string, @Body() dto: JoinCardSortingSessionDto) {
    return this.cardSortingService.joinSession(id, dto.participanteId);
  }

  @Post(':id/results')
  submitResult(@Param('id') id: string, @Body() dto: SubmitCardSortingResultDto) {
    return this.cardSortingService.submitResult(id, dto.grupos);
  }
}