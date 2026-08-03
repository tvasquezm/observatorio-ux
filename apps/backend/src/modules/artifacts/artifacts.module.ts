// apps/backend/src/modules/artifacts/artifacts.module.ts

import { Module } from '@nestjs/common';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';
import { PrismaModule } from '../../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule],
  controllers: [ArtifactsController],
  providers: [ArtifactsService],
  exports: [ArtifactsService], 
})
export class ArtifactsModule {}