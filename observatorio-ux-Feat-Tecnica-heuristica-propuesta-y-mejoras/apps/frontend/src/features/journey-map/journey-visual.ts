import type { Emocion, JourneyMapContenido } from './api/journey-map.api';
import type { ProcessStep } from '../../shared/components/TechniqueProcess';

// Alto del lienzo de la curva y altura (y) de cada nivel emocional.
export const CURVA_ALTO = 112;
export const CURVA_ANCHO_FASE = 100;
export const NIVEL_Y: Record<Emocion, number> = { Positiva: 20, Neutral: 56, Negativa: 92 };

export interface PuntoCurva {
  x: number;
  y: number;
}

export function puntosCurva(emociones: Emocion[]): PuntoCurva[] {
  return emociones.map((emocion, index) => ({
    x: (index + 0.5) * CURVA_ANCHO_FASE,
    y: NIVEL_Y[emocion],
  }));
}

// Curva suave (Bézier con tangentes horizontales) que une los puntos.
export function trazoCurva(puntos: PuntoCurva[]): string {
  if (puntos.length === 0) return '';
  const [primero, ...resto] = puntos;
  let d = `M ${primero.x} ${primero.y}`;
  let previo = primero;
  for (const punto of resto) {
    const medio = (punto.x - previo.x) / 2;
    d += ` C ${previo.x + medio} ${previo.y}, ${punto.x - medio} ${punto.y}, ${punto.x} ${punto.y}`;
    previo = punto;
  }
  return d;
}

export function procesoJourney(contenido: JourneyMapContenido): ProcessStep[] {
  const { perfilUsuario, objetivo, eventoInicio, fases, evidencia } = contenido;
  const conDolor = fases.filter((fase) => fase.dificultades.length > 0).length;
  const conOportunidad = fases.filter((fase) => fase.oportunidades.length > 0).length;
  const perfilOk = perfilUsuario.nombre.trim() !== '' && perfilUsuario.rol.trim() !== '';

  return [
    {
      id: 'perfil',
      label: 'Perfil de usuario',
      detail: perfilOk ? `${perfilUsuario.nombre} · ${perfilUsuario.rol}` : 'Falta nombre o rol',
      done: perfilOk,
    },
    {
      id: 'objetivo',
      label: 'Objetivo y evento de inicio',
      detail: objetivo?.trim() || eventoInicio?.trim() ? 'Definidos' : 'Sin definir',
      done: Boolean(objetivo?.trim() || eventoInicio?.trim()),
    },
    {
      id: 'fases',
      label: 'Fases del recorrido',
      detail: `${fases.length} ${fases.length === 1 ? 'fase' : 'fases'}`,
      done: fases.length >= 3,
    },
    {
      id: 'dolor',
      label: 'Emociones y puntos de dolor',
      detail: `${conDolor} de ${fases.length} fases con dificultades`,
      done: conDolor > 0,
    },
    {
      id: 'oportunidades',
      label: 'Oportunidades de mejora',
      detail: `${conOportunidad} de ${fases.length} fases`,
      done: conOportunidad > 0,
    },
    {
      id: 'evidencia',
      label: 'Evidencia',
      detail: evidencia.length > 0 ? `${evidencia.length} ${evidencia.length === 1 ? 'fuente' : 'fuentes'}` : 'Sin evidencia',
      done: evidencia.length > 0,
    },
  ];
}
