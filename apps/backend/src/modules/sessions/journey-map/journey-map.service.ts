// apps/backend/src/modules/artefactos/journey-map/journey-map.service.ts
import { Injectable } from '@nestjs/common';
import { UxArtifactService } from '../../../core/ux-artifact/ux-artifact.service';
import type { JourneyMapContenido } from '@observatorio-ux/shared-types';

@Injectable()
export class JourneyMapService {
  constructor(private readonly uxArtifact: UxArtifactService) {}

  crear(proyectoId: string, contenido: JourneyMapContenido, autorId: string) {
    return this.uxArtifact.crearVersionInicial(
      'JOURNEY_MAP',
      proyectoId,
      contenido,
      autorId,
    );
  }

  obtenerUltima(artefactoLogicoId: string) {
    return this.uxArtifact.obtenerUltimaVersion(artefactoLogicoId);
  }

  obtenerHistorial(artefactoLogicoId: string) {
    return this.uxArtifact.obtenerHistorial(artefactoLogicoId);
  }

  adquirirLock(artefactoLogicoId: string, usuarioId: string) {
    return this.uxArtifact.adquirirLock(artefactoLogicoId, usuarioId);
  }

  liberarLock(artefactoLogicoId: string, usuarioId: string) {
    return this.uxArtifact.liberarLock(artefactoLogicoId, usuarioId);
  }

  guardarNuevaVersion(
    artefactoLogicoId: string,
    contenido: JourneyMapContenido,
    usuarioId: string,
  ) {
    return this.uxArtifact.guardarNuevaVersion(
      artefactoLogicoId,
      contenido,
      usuarioId,
    );
  }
}
