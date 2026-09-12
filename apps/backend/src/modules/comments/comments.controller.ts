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
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './comments.dto';

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
