import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, RolesGuard],
})
export class CommentsModule {}
