import { describe, expect, it } from 'vitest';
import { prioridadNumerica, type IncidenteCritico } from './api/momentos-criticos.api';
import { calorCelda, distribucionPrioridad, FRECUENCIAS, IMPACTOS, prioridad, procesoMomentos } from './momentos-visual';

const inc = (extra: Partial<IncidenteCritico> = {}): IncidenteCritico => ({
  nombre: 'N', descripcion: 'D', tipo: 'Negativo', impacto: 'Alto', frecuencia: 'Alta',
  causa: 'C', accionesSugeridas: ['A'], ...extra,
});

describe('momentos-visual', () => {
  it('el calor de cada celda coincide con la prioridad numérica del backend', () => {
    IMPACTOS.forEach((impacto, ii) => FRECUENCIAS.forEach((frecuencia, fi) => {
      const peso = prioridadNumerica(inc({ impacto, frecuencia }));
      const esperado = peso >= 6 ? 'alta' : peso >= 3 ? 'media' : 'baja';
      expect(calorCelda(ii, fi)).toBe(esperado);
    }));
  });

  it('etiqueta la prioridad y distingue las experiencias positivas', () => {
    expect(prioridad(inc())).toBe('Prioridad alta');
    expect(prioridad(inc({ impacto: 'Medio', frecuencia: 'Media' }))).toBe('Prioridad media');
    expect(prioridad(inc({ impacto: 'Bajo', frecuencia: 'Baja' }))).toBe('Prioridad baja');
    expect(prioridad(inc({ tipo: 'Positivo' }))).toBe('Oportunidad de refuerzo');
  });

  it('cuenta los incidentes por prioridad', () => {
    const lista = [inc(), inc({ impacto: 'Medio', frecuencia: 'Media' }), inc({ impacto: 'Bajo', frecuencia: 'Baja' }), inc({ tipo: 'Positivo' })];
    expect(distribucionPrioridad(lista)).toEqual({ alta: 1, media: 1, baja: 1, positivos: 1 });
  });

  it('calcula el proceso según lo registrado', () => {
    expect(procesoMomentos(0, []).map((p) => p.done)).toEqual([false, false, false, false, false]);
    expect(procesoMomentos(1, [inc()]).map((p) => p.done)).toEqual([true, true, true, true, true]);
    const parcial = procesoMomentos(1, [inc(), inc({ causa: ' ', accionesSugeridas: [] })]);
    expect(parcial.map((p) => p.done)).toEqual([true, true, false, true, false]);
    expect(parcial[4].detail).toBe('1 de 2 con acción');
  });
});
