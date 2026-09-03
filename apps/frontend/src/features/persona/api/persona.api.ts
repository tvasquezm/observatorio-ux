// apps/frontend/src/features/persona/api/persona.api.ts
//
// Wrapper delgado sobre shared/api/artifacts.api.ts para tipo PERSONA.

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

// Espejo de PersonaSchema (packages/shared-types/src/domains/persona.ts).
// Se duplica en vez de importar el paquete compartido, siguiendo el mismo
// criterio que features/card-sorting/api/card-sorting.api.ts: el frontend
// no depende del build de shared-types para sus tipos de UI.
export interface PersonaContenido {
  nombreCompleto: string;
  edad?: number;
  ocupacion?: string;
  fotografiaUrl?: string;
  acercaDe?: string;
  familia?: string;
  hobbies: string[];
  habilidades: string[];
  objetivos: string[];
  necesidades: string[];
  motivaciones: string[];
  frustraciones: string[];
  comportamientos: string[];
  contextoDeUso?: string;
  expectativas: string[];
}

export type PersonaArtifact = UxArtifact<PersonaContenido>;

export async function listPersonas(proyectoId: string): Promise<PersonaArtifact[]> {
  const items = await listArtifacts<PersonaContenido>(proyectoId, 'PERSONA');
  return dedupeLatestVersions(items);
}

export function getPersona(
  proyectoId: string,
  artefactoId: string,
): Promise<PersonaArtifact> {
  return getArtifact<PersonaContenido>(proyectoId, artefactoId);
}

export function createPersona(
  proyectoId: string,
  contenido: PersonaContenido,
): Promise<PersonaArtifact> {
  return createArtifact<PersonaContenido>(proyectoId, 'PERSONA', contenido);
}

export function updatePersona(
  proyectoId: string,
  artefactoId: string,
  contenido: PersonaContenido,
): Promise<PersonaArtifact> {
  return createArtifactVersion<PersonaContenido>(proyectoId, artefactoId, contenido);
}

export function lockPersona(
  proyectoId: string,
  artefactoId: string,
  ttlSegundos?: number,
): Promise<PersonaArtifact> {
  return acquireLock<PersonaContenido>(proyectoId, artefactoId, ttlSegundos);
}

export function unlockPersona(
  proyectoId: string,
  artefactoId: string,
): Promise<PersonaArtifact> {
  return releaseLock<PersonaContenido>(proyectoId, artefactoId);
}

/**
 * Soft delete (Sprint 3, decisión del equipo: proteger la cadena de
 * evidencia). No borra la fila — marca deletedAt y deja de aparecer en
 * listPersonas.
 */
export function deletePersona(
  proyectoId: string,
  artefactoId: string,
): Promise<void> {
  return deleteArtifact(proyectoId, artefactoId);
}
