import { prioridadNumerica, type IncidenteCritico } from './api/momentos-criticos.api';
import type { ProcessStep } from '../../shared/components/TechniqueProcess';

export const IMPACTOS = ['Alto', 'Medio', 'Bajo'] as const;
export const FRECUENCIAS = ['Alta', 'Media', 'Baja'] as const;

export type NivelCalor = 'alta' | 'media' | 'baja';

export interface IncidenteConPerfil extends IncidenteCritico {
  key: string;
  perfilNombre: string;
}

export const prioridad = (inc: IncidenteCritico) =>
  inc.tipo === 'Positivo'
    ? 'Oportunidad de refuerzo'
    : prioridadNumerica(inc) >= 6
      ? 'Prioridad alta'
      : prioridadNumerica(inc) >= 3
        ? 'Prioridad media'
        : 'Prioridad baja';

// Calor de una celda de la matriz según su posición: IMPACTOS y FRECUENCIAS
// van de mayor a menor, así que el peso es (3 - índice) en cada eje.
export function calorCelda(impactoIndex: number, frecuenciaIndex: number): NivelCalor {
  const peso = (3 - impactoIndex) * (3 - frecuenciaIndex);
  return peso >= 6 ? 'alta' : peso >= 3 ? 'media' : 'baja';
}

export function distribucionPrioridad(incidentes: IncidenteCritico[]) {
  const total = { alta: 0, media: 0, baja: 0, positivos: 0 };
  for (const inc of incidentes) {
    if (inc.tipo === 'Positivo') total.positivos += 1;
    else if (prioridadNumerica(inc) >= 6) total.alta += 1;
    else if (prioridadNumerica(inc) >= 3) total.media += 1;
    else total.baja += 1;
  }
  return total;
}

export function procesoMomentos(perfiles: number, incidentes: IncidenteCritico[]): ProcessStep[] {
  const hay = incidentes.length > 0;
  const problemas = incidentes.filter((inc) => inc.tipo === 'Negativo').length;
  const conCausa = incidentes.filter((inc) => inc.causa.trim() !== '').length;
  const conAcciones = incidentes.filter((inc) => inc.accionesSugeridas.length > 0).length;

  return [
    { id: 'perfil', label: 'Perfil de usuario', detail: `${perfiles} ${perfiles === 1 ? 'perfil' : 'perfiles'}`, done: perfiles > 0 },
    { id: 'incidentes', label: 'Incidentes descritos', detail: `${incidentes.length} en total`, done: hay },
    { id: 'causas', label: 'Causas identificadas', detail: `${conCausa} de ${incidentes.length}`, done: hay && conCausa === incidentes.length },
    {
      id: 'valoracion',
      label: 'Impacto y frecuencia',
      detail: `${problemas} ${problemas === 1 ? 'problema' : 'problemas'} · ${incidentes.length - problemas} positivos`,
      done: hay,
    },
    { id: 'acciones', label: 'Acciones sugeridas', detail: `${conAcciones} de ${incidentes.length} con acción`, done: hay && conAcciones === incidentes.length },
  ];
}
