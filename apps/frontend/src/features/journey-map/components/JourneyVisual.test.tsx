import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { JourneyMapContenido } from '../api/journey-map.api';
import { JourneyEmotionStrip, JourneyVisual } from './JourneyVisual';

const base = { actividades: [], touchpoints: [], pensamientos: [], dificultades: [], ganancias: [], oportunidades: [] };
const contenido: JourneyMapContenido = {
  perfilUsuario: { id: 'p1', nombre: 'Camila Rojas', rol: 'Estudiante' },
  objetivo: 'Conseguir bibliografía',
  eventoInicio: 'Recibe un enunciado',
  fases: [
    { ...base, nombre: 'Descubrimiento', emocion: 'Neutral', touchpoints: ['Google'], dificultades: ['No distingue catálogo'] },
    { ...base, nombre: 'Préstamo', emocion: 'Negativa', oportunidades: ['Confirmación en pantalla'] },
    { ...base, nombre: 'Renovación', emocion: 'Positiva', ganancias: ['Renueva en un minuto'] },
  ],
  evidencia: ['Entrevistas'],
};

describe('JourneyVisual', () => {
  it('muestra perfil, objetivo, evento y el proceso', () => {
    render(<JourneyVisual contenido={contenido} />);
    expect(screen.getByRole('heading', { name: 'Camila Rojas' })).toBeInTheDocument();
    expect(screen.getByText('Conseguir bibliografía')).toBeInTheDocument();
    expect(screen.getByText('Recibe un enunciado')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Proceso del Journey Map' })).toBeInTheDocument();
  });

  it('dibuja una columna por fase con su emoción y sus chips', () => {
    render(<JourneyVisual contenido={contenido} />);
    const tabla = screen.getByRole('table', { name: 'Journey Map por fases' });
    expect(within(tabla).getAllByRole('columnheader')).toHaveLength(4);
    expect(within(tabla).getByText('Negativa')).toBeInTheDocument();
    expect(within(tabla).getByText('Google')).toBeInTheDocument();
    expect(within(tabla).getByText('Renueva en un minuto')).toBeInTheDocument();
  });

  it('informa los carriles vacíos para lectores de pantalla', () => {
    render(<JourneyVisual contenido={contenido} />);
    expect(screen.getAllByText('Sin información registrada.').length).toBeGreaterThan(0);
  });

  it('la tira de emociones describe cada fase', () => {
    render(<JourneyEmotionStrip fases={contenido.fases} />);
    expect(screen.getByText('Préstamo: Negativa')).toBeInTheDocument();
  });
});
