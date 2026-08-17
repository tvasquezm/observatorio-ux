import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';
import {
  CreateCardSortingSessionDto,
  SubmitCardSortingResultDto,
} from './dto/card-sorting.dto';
import { CardSortingService } from './card-sorting.service';

@ApiTags('card-sorting')
@ApiBearerAuth()
@Controller('card-sorting/sessions')
export class CardSortingController {
  constructor(private readonly cardSortingService: CardSortingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  createSession(
    @Body() dto: CreateCardSortingSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.createSession(dto, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN', 'PARTICIPANTE')
  getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.getSession(id, user);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PARTICIPANTE')
  joinSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.joinSession(id, user);
  }

  @Post(':id/results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PARTICIPANTE')
  submitResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitCardSortingResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cardSortingService.submitResult(id, dto.grupos, user);
  }
}
