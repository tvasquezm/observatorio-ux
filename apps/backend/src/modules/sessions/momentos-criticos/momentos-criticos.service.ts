// apps/backend/src/modules/artefactos/momentos-criticos/momentos-criticos.service.ts
import { Injectable } from '@nestjs/common';
import { UxArtifactService } from '../../../core/ux-artifact/ux-artifact.service';
import type { MomentosCriticosContenido } from '@observatorio-ux/shared-types';

@Injectable()
export class MomentosCriticosService {
  constructor(private readonly uxArtifact: UxArtifactService) {}

  crear(
    proyectoId: string,
    contenido: MomentosCriticosContenido,
    autorId: string,
  ) {
    return this.uxArtifact.crearVersionInicial(
      'MOMENTOS_CRITICOS',
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
    contenido: MomentosCriticosContenido,
    usuarioId: string,
  ) {
    return this.uxArtifact.guardarNuevaVersion(
      artefactoLogicoId,
      contenido,
      usuarioId,
    );
  }
}
