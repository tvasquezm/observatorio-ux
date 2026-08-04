// apps/backend/src/modules/artefactos/persona/persona.module.ts
import { Module } from '@nestjs/common';
import { PersonaController } from './persona.controller';
import { PersonaService } from './persona.service';
import { UxArtifactModule } from '../../../core/ux-artifact/ux-artifact.module';

@Module({
  imports: [UxArtifactModule],
  controllers: [PersonaController],
  providers: [PersonaService],
})
export class PersonaModule {}
