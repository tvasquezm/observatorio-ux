import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, RolesGuard],
})
export class CommentsModule {}
