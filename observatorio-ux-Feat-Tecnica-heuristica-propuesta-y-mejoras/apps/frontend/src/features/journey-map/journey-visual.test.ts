import { describe, expect, it } from 'vitest';
import type { JourneyMapContenido } from './api/journey-map.api';
import { NIVEL_Y, procesoJourney, puntosCurva, trazoCurva } from './journey-visual';

const fase = (nombre: string, emocion: 'Positiva' | 'Neutral' | 'Negativa', extra = {}) => ({
  nombre, emocion, actividades: [], touchpoints: [], pensamientos: [],
  dificultades: [], ganancias: [], oportunidades: [], ...extra,
});

const completo: JourneyMapContenido = {
  perfilUsuario: { id: 'p1', nombre: 'Camila', rol: 'Estudiante' },
  objetivo: 'Renovar un préstamo',
  fases: [
    fase('A', 'Neutral', { dificultades: ['x'], oportunidades: ['y'] }),
    fase('B', 'Positiva'),
    fase('C', 'Negativa'),
  ],
  evidencia: ['Entrevistas'],
};

describe('journey-visual', () => {
  it('ubica cada fase en el nivel de su emoción', () => {
    const puntos = puntosCurva(['Positiva', 'Neutral', 'Negativa']);
    expect(puntos.map((p) => p.y)).toEqual([NIVEL_Y.Positiva, NIVEL_Y.Neutral, NIVEL_Y.Negativa]);
    expect(puntos.map((p) => p.x)).toEqual([50, 150, 250]);
  });

  it('traza una curva por cada tramo y vacío sin puntos', () => {
    expect(trazoCurva([])).toBe('');
    expect(trazoCurva(puntosCurva(['Neutral']))).toBe('M 50 56');
    expect(trazoCurva(puntosCurva(['Positiva', 'Negativa'])).match(/C/g)).toHaveLength(1);
  });

  it('marca como completos los pasos con datos', () => {
    expect(procesoJourney(completo).map((s) => s.done)).toEqual([true, true, true, true, true, true]);
  });

  it('marca pendientes los pasos sin datos', () => {
    const vacio: JourneyMapContenido = {
      perfilUsuario: { id: 'p1', nombre: '', rol: 'Rol' },
      fases: [fase('A', 'Neutral'), fase('B', 'Neutral')],
      evidencia: [],
    };
    expect(procesoJourney(vacio).map((s) => s.done)).toEqual([false, false, false, false, false, false]);
  });
});
