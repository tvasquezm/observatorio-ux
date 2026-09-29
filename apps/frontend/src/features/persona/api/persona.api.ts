// apps/frontend/src/features/persona/api/persona.api.ts
//
// Wrapper delgado sobre shared/api/artifacts.api.ts para tipo PERSONA.

import type { Persona as PersonaContenido } from '@observatorio-ux/shared-types';

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

export type { PersonaContenido };

export type PersonaArtifact = UxArtifact<PersonaContenido>;

function normalizePersona(artifact: PersonaArtifact): PersonaArtifact {
  const content = artifact.contenido as PersonaContenido & { nombre?: string };
  // Compatibilidad de lectura con fichas demo anteriores al esquema actual.
  return { ...artifact, contenido: {
    ...content,
    nombreCompleto: content.nombreCompleto || content.nombre || 'Persona sin nombre',
    hobbies: content.hobbies ?? [], habilidades: content.habilidades ?? [],
    objetivos: content.objetivos ?? [], necesidades: content.necesidades ?? [],
    motivaciones: content.motivaciones ?? [], frustraciones: content.frustraciones ?? [],
    comportamientos: content.comportamientos ?? [], expectativas: content.expectativas ?? [],
  } };
}

export async function listPersonas(proyectoId: string): Promise<PersonaArtifact[]> {
  const items = await listArtifacts<PersonaContenido>(proyectoId, 'PERSONA');
  return dedupeLatestVersions(items).map(normalizePersona);
}

export async function getPersona(
  proyectoId: string,
  artefactoId: string,
): Promise<PersonaArtifact> {
  return normalizePersona(await getArtifact<PersonaContenido>(proyectoId, artefactoId));
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
  expectedVersion?: number,
): Promise<PersonaArtifact> {
  return createArtifactVersion<PersonaContenido>(proyectoId, artefactoId, contenido, expectedVersion);
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
