// apps/frontend/src/features/journey-map/api/journey-map.api.ts

import {
  acquireLock,
  createArtifact,
  createArtifactVersion,
  dedupeLatestVersions,
  deleteArtifact,
  getArtifact,
  listArtifacts,
  releaseLock,
  type UxArtifact,
} from '../../../shared/api/artifacts.api';

// Espejo de journey-map.ts en shared-types.
export type Emocion = 'Positiva' | 'Neutral' | 'Negativa';

export interface UserProfile {
  id: string;
  nombre: string;
  rol: string;
}

export interface Phase {
  nombre: string;
  touchpoints: string[];
  pensamientos: string[];
  emocion: Emocion;
  oportunidades: string[];
}

export interface JourneyMapContenido {
  perfilUsuario: UserProfile;
  fases: Phase[]; // mínimo 3, según JourneyMapSchema
}

export type JourneyMapArtifact = UxArtifact<JourneyMapContenido>;

export async function listJourneys(proyectoId: string): Promise<JourneyMapArtifact[]> {
  const items = await listArtifacts<JourneyMapContenido>(proyectoId, 'JOURNEY_MAP');
  return dedupeLatestVersions(items);
}

export function getJourney(
  proyectoId: string,
  artefactoId: string,
): Promise<JourneyMapArtifact> {
  return getArtifact<JourneyMapContenido>(proyectoId, artefactoId);
}

export function createJourney(
  proyectoId: string,
  contenido: JourneyMapContenido,
): Promise<JourneyMapArtifact> {
  return createArtifact<JourneyMapContenido>(proyectoId, 'JOURNEY_MAP', contenido);
}

export function updateJourney(
  proyectoId: string,
  artefactoId: string,
  contenido: JourneyMapContenido,
): Promise<JourneyMapArtifact> {
  return createArtifactVersion<JourneyMapContenido>(proyectoId, artefactoId, contenido);
}

export function lockJourney(
  proyectoId: string,
  artefactoId: string,
  ttlSegundos?: number,
): Promise<JourneyMapArtifact> {
  return acquireLock<JourneyMapContenido>(proyectoId, artefactoId, ttlSegundos);
}

export function unlockJourney(
  proyectoId: string,
  artefactoId: string,
): Promise<JourneyMapArtifact> {
  return releaseLock<JourneyMapContenido>(proyectoId, artefactoId);
}

/** Soft delete — ver nota en persona.api.ts. */
export function deleteJourney(
  proyectoId: string,
  artefactoId: string,
): Promise<void> {
  return deleteArtifact(proyectoId, artefactoId);
}

// --- Helpers de "etapa" (no existen como entidad propia en el backend: ---
// --- son elementos de fases[] dentro de un mismo artefacto). Editar una ---
// --- etapa = mutar el array en memoria y llamar updateJourney con todo. ---

export function replacePhase(
  contenido: JourneyMapContenido,
  index: number,
  phase: Phase,
): JourneyMapContenido {
  const fases = [...contenido.fases];
  fases[index] = phase;
  return { ...contenido, fases };
}

export function addPhase(
  contenido: JourneyMapContenido,
  phase: Phase,
): JourneyMapContenido {
  return { ...contenido, fases: [...contenido.fases, phase] };
}

export function removePhase(
  contenido: JourneyMapContenido,
  index: number,
): JourneyMapContenido {
  // OJO: JourneyMapSchema exige mínimo 3 fases — validar en el cliente
  // antes de llamar updateJourney, o el backend responderá 400.
  return { ...contenido, fases: contenido.fases.filter((_, i) => i !== index) };
}