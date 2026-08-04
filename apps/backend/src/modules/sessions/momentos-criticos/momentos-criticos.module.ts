// apps/backend/src/modules/artefactos/momentos-criticos/momentos-criticos.module.ts
import { Module } from '@nestjs/common';
import { MomentosCriticosController } from './momentos-criticos.controller';
import { MomentosCriticosService } from './momentos-criticos.service';
import { UxArtifactModule } from '../../../core/ux-artifact/ux-artifact.module';

@Module({
  imports: [UxArtifactModule],
  controllers: [MomentosCriticosController],
  providers: [MomentosCriticosService],
})
export class MomentosCriticosModule {}
