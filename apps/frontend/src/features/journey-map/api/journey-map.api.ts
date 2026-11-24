// apps/frontend/src/features/journey-map/api/journey-map.api.ts

import type {
  JourneyMap as JourneyMapContenido,
  Phase,
  UserProfile,
} from '@observatorio-ux/shared-types';
import {
  createArtifact,
  dedupeLatestVersions,
  getArtifact,
  listArtifacts,
  type UxArtifact,
} from '../../../shared/api/artifacts.api';

export type Emocion = Phase['emocion'];
export type { JourneyMapContenido, Phase, UserProfile };

export type JourneyMapArtifact = UxArtifact<JourneyMapContenido>;

function normalizeJourney(artifact: JourneyMapArtifact): JourneyMapArtifact {
  const content = artifact.contenido;
  return { ...artifact, contenido: {
    ...content,
    evidencia: content.evidencia ?? [],
    fases: content.fases.map((phase) => ({
      ...phase,
      actividades: phase.actividades ?? [],
      touchpoints: phase.touchpoints ?? [],
      pensamientos: phase.pensamientos ?? [],
      dificultades: phase.dificultades ?? [],
      ganancias: phase.ganancias ?? [],
      oportunidades: phase.oportunidades ?? [],
    })),
  } };
}

export async function listJourneys(proyectoId: string): Promise<JourneyMapArtifact[]> {
  const items = await listArtifacts<JourneyMapContenido>(proyectoId, 'JOURNEY_MAP');
  return dedupeLatestVersions(items).map(normalizeJourney);
}

export async function getJourney(
  proyectoId: string,
  artefactoId: string,
): Promise<JourneyMapArtifact> {
  return normalizeJourney(await getArtifact<JourneyMapContenido>(proyectoId, artefactoId));
}

export function createJourney(
  proyectoId: string,
  contenido: JourneyMapContenido,
): Promise<JourneyMapArtifact> {
  return createArtifact<JourneyMapContenido>(proyectoId, 'JOURNEY_MAP', contenido);
}

