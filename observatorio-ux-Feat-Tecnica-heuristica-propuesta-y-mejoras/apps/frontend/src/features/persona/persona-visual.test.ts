import { describe, expect, it } from 'vitest';
import { PersonaSchema } from '@observatorio-ux/shared-types';
import { iniciales, procesoPersona } from './persona-visual';

describe('persona-visual', () => {
  it('saca las iniciales de las dos primeras palabras', () => {
    expect(iniciales('  camila rojas pérez ')).toBe('CR');
    expect(iniciales('Ana')).toBe('A');
  });

  it('marca completos todos los pasos de una persona completa', () => {
    const persona = PersonaSchema.parse({
      nombreCompleto: 'Camila Rojas', edad: 21, objetivos: ['A'], frustraciones: ['B'],
      rolEnServicio: 'Usuaria', evidencia: ['Entrevistas'], estadoValidacion: 'VALIDADA',
    });
    expect(procesoPersona(persona).map((paso) => paso.done)).toEqual([true, true, true, true, true, true]);
  });

  it('marca pendientes los pasos sin datos y acepta edad 0', () => {
    const persona = PersonaSchema.parse({ nombreCompleto: 'Ana', edad: 0 });
    expect(procesoPersona(persona).map((paso) => paso.done)).toEqual([true, false, false, false, false, false]);
    expect(procesoPersona(PersonaSchema.parse({ nombreCompleto: 'Ana' }))[0].done).toBe(false);
  });
});
