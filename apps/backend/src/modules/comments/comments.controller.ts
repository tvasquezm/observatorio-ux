import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Roles } from '../../core/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto, UpdateCommentDto } from './comments.dto.js';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:proyectoId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  create(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.create(proyectoId, dto, user);
  }

  @Get()
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  findAll(
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Query('artefactoLogicoId') artefactoLogicoId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.findAll(proyectoId, artefactoLogicoId, user);
  }

  @Patch(':comentarioId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  update(
    @Param('comentarioId', ParseUUIDPipe) comentarioId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.update(comentarioId, dto, user);
  }

  @Delete(':comentarioId')
  @Roles('ESTUDIANTE', 'DOCENTE', 'ADMIN')
  remove(
    @Param('comentarioId', ParseUUIDPipe) comentarioId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.softDelete(comentarioId, user);
  }
}
