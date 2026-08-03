// apps/backend/src/modules/artifacts/artifacts.controller.ts

import { Body, Controller, Param, Post, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { CreateVersionDto } from './dto/artifacts.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post(':id/lock')
  lockArtifact(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.artifactsService.lock(id, req.user.id);
  }

  @Post(':id/versions')
  createVersion(
    @Param('id') id: string,
    @Body() dto: CreateVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.artifactsService.createVersion(
      id,
      req.user.id,
      dto.contenido,
    );
  }

  // NUEVO: Endpoint silencioso para cuando el usuario cierra la pestaña
  @Post(':id/unlock')
  @HttpCode(HttpStatus.NO_CONTENT) 
  unlockArtifact(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.artifactsService.unlock(id, req.user.id);
  }
}