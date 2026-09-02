// apps/frontend/src/features/momentos-criticos/api/momentos-criticos.api.ts

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

// Espejo de momentos-criticos.ts en shared-types.
export type TipoIncidente = 'Positivo' | 'Negativo';
export type ImpactoIncidente = 'Alto' | 'Medio' | 'Bajo';
export type FrecuenciaIncidente = 'Alta' | 'Media' | 'Baja';

export interface UserProfile {
  id: string;
  nombre: string;
  rol: string;
}

export interface IncidenteCritico {
  nombre: string;
  descripcion: string;
  tipo: TipoIncidente;
  impacto: ImpactoIncidente;
  frecuencia: FrecuenciaIncidente;
  causa: string;
  accionesSugeridas: string[];
}

export interface MomentosCriticosContenido {
  perfilUsuario: UserProfile;
  incidentes: IncidenteCritico[]; // mínimo 1, según MomentosCriticosSchema
}

export type MomentosCriticosArtifact = UxArtifact<MomentosCriticosContenido>;

export async function listCriticalMoments(
  proyectoId: string,
): Promise<MomentosCriticosArtifact[]> {
  const items = await listArtifacts<MomentosCriticosContenido>(
    proyectoId,
    'MOMENTOS_CRITICOS',
  );
  return dedupeLatestVersions(items);
}

export function getCriticalMoment(
  proyectoId: string,
  artefactoId: string,
): Promise<MomentosCriticosArtifact> {
  return getArtifact<MomentosCriticosContenido>(proyectoId, artefactoId);
}

export function createCriticalMoment(
  proyectoId: string,
  contenido: MomentosCriticosContenido,
): Promise<MomentosCriticosArtifact> {
  return createArtifact<MomentosCriticosContenido>(
    proyectoId,
    'MOMENTOS_CRITICOS',
    contenido,
  );
}

export function updateCriticalMoment(
  proyectoId: string,
  artefactoId: string,
  contenido: MomentosCriticosContenido,
): Promise<MomentosCriticosArtifact> {
  return createArtifactVersion<MomentosCriticosContenido>(
    proyectoId,
    artefactoId,
    'MOMENTOS_CRITICOS', // 👈 Se agrega el tipo explícito para la validación del DTO
    contenido,
  ) as Promise<MomentosCriticosArtifact>;
}

export function lockCriticalMoment(
  proyectoId: string,
  artefactoId: string,
  ttlSegundos?: number,
): Promise<MomentosCriticosArtifact> {
  return acquireLock<MomentosCriticosContenido>(proyectoId, artefactoId, ttlSegundos);
}

export function unlockCriticalMoment(
  proyectoId: string,
  artefactoId: string,
): Promise<MomentosCriticosArtifact> {
  return releaseLock<MomentosCriticosContenido>(proyectoId, artefactoId);
}

/** Soft delete — ver nota en persona.api.ts. */
export function deleteCriticalMoment(
  proyectoId: string,
  artefactoId: string,
): Promise<void> {
  // 👈 Cambiado a Promise<void> para alinearlo con el contrato de la API
  return deleteArtifact(proyectoId, artefactoId);
}

// --- Helpers de "incidente" (sub-elemento de incidentes[], no entidad ---
// --- propia — mismo patrón que las fases del journey map). ---

// Escala numérica solo para ordenar/graficar en la matriz de UI — el
// backend NUNCA recibe estos números, solo los enums Alto/Medio/Bajo etc.
const IMPACTO_PESO: Record<ImpactoIncidente, number> = { Bajo: 1, Medio: 2, Alto: 3 };
const FRECUENCIA_PESO: Record<FrecuenciaIncidente, number> = { Baja: 1, Media: 2, Alta: 3 };

export function prioridadNumerica(incidente: IncidenteCritico): number {
  return IMPACTO_PESO[incidente.impacto] * FRECUENCIA_PESO[incidente.frecuencia];
}

export function replaceIncidente(
  contenido: MomentosCriticosContenido,
  index: number,
  incidente: IncidenteCritico,
): MomentosCriticosContenido {
  const incidentes = [...contenido.incidentes];
  incidentes[index] = incidente;
  return { ...contenido, incidentes };
}

export function addIncidente(
  contenido: MomentosCriticosContenido,
  incidente: IncidenteCritico,
): MomentosCriticosContenido {
  return { ...contenido, incidentes: [...contenido.incidentes, incidente] };
}

export function removeIncidente(
  contenido: MomentosCriticosContenido,
  index: number,
): MomentosCriticosContenido {
  // MomentosCriticosSchema exige mínimo 1 incidente — validar en cliente.
  return {
    ...contenido,
    incidentes: contenido.incidentes.filter((_, i) => i !== index),
  };
}
