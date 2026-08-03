// apps/backend/src/modules/card-sorting/card-sorting.controller.ts
//
// Con el prefijo global 'api':
//   POST /api/card-sorting/sessions               (evaluador crea el estudio — requiere auth)
//   GET  /api/card-sorting/sessions/:id            (público: sirve tanto para maestra como participante)
//   POST /api/card-sorting/sessions/:id/join       (participante se une — sin JwtAuthGuard)
//   POST /api/card-sorting/sessions/:id/results    (participante envía su resultado — sin JwtAuthGuard)
//
// Aislamiento: solo importa su propio service, sus propios DTOs, y el
// guard compartido en core/. Nada de otras metodologías.

import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CardSortingService } from './card-sorting.service';
import {
  CreateCardSortingSessionDto,
  JoinCardSortingSessionDto,
  SubmitCardSortingResultDto,
} from './dto/card-sorting.dto';
// Ajusta al path real de tu guard compartido en core/.
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@Controller('card-sorting/sessions')
export class CardSortingController {
  constructor(private readonly cardSortingService: CardSortingService) {}

  // Solo un Usuario autenticado (evaluador) puede crear un estudio.
  @UseGuards(JwtAuthGuard)
  @Post()
  createSession(
    @Body() dto: CreateCardSortingSessionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cardSortingService.createSession(
      dto.proyectoId,
      req.user.id,
      {
        tipo: dto.tipo,
        tarjetas: dto.tarjetas,
        categorias: dto.categorias,
      },
    );
  }

  // Lectura pública: la consume tanto el dashboard del evaluador como
  // el propio participante mientras resuelve el sorting.
  @Get(':id')
  getSession(@Param('id') id: string) {
    return this.cardSortingService.getSession(id);
  }

  // Sin JwtAuthGuard: un Participante no tiene JWT de Usuario en este
  // schema, solo su Consentimiento previamente registrado.
  @Post(':id/join')
  joinSession(@Param('id') id: string, @Body() dto: JoinCardSortingSessionDto) {
    return this.cardSortingService.joinSession(id, dto.participanteId);
  }

  @Post(':id/results')
  submitResult(
    @Param('id') id: string,
    @Body() dto: SubmitCardSortingResultDto,
  ) {
    return this.cardSortingService.submitResult(id, dto.grupos);
  }
}