import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IncidentMeters, MomentosDistribucion, MomentosMatrix } from './MomentosVisual';
import type { IncidenteConPerfil } from '../momentos-visual';

const base = { descripcion: 'D', causa: 'C', accionesSugeridas: ['Acción'], perfilNombre: 'Ana' };
const lista: IncidenteConPerfil[] = [
  { ...base, key: 'k1', nombre: 'Checkout falla', tipo: 'Negativo', impacto: 'Alto', frecuencia: 'Alta' },
  { ...base, key: 'k2', nombre: 'Ayuda inmediata', tipo: 'Positivo', impacto: 'Alto', frecuencia: 'Alta' },
  { ...base, key: 'k3', nombre: 'Etiqueta confusa', tipo: 'Negativo', impacto: 'Bajo', frecuencia: 'Baja' },
];

describe('MomentosMatrix', () => {
  it('ubica cada incidente en su celda con el color de su prioridad', () => {
    render(<MomentosMatrix incidentes={lista} />);
    const alta = screen.getByTestId('celda-Alto-Alta');
    expect(alta).toHaveClass('tv-heat--alta');
    expect(within(alta).getByText('Checkout falla')).toBeInTheDocument();
    expect(within(alta).getByText('Ayuda inmediata')).toBeInTheDocument();
    expect(screen.getByTestId('celda-Bajo-Baja')).toHaveClass('tv-heat--baja');
    expect(screen.getByTestId('celda-Medio-Media')).toHaveClass('tv-heat--media');
    expect(within(screen.getByTestId('celda-Medio-Media')).getByText('Sin incidentes')).toBeInTheDocument();
  });

  it('numera las burbujas según el orden recibido', () => {
    render(<MomentosMatrix incidentes={lista} />);
    expect(screen.getByText('3').className).toContain('tv-bubble--neg');
    expect(screen.getByText('2').className).toContain('tv-bubble--pos');
  });
});

describe('MomentosDistribucion', () => {
  it('muestra los conteos y no se dibuja sin incidentes', () => {
    const { container, rerender } = render(<MomentosDistribucion incidentes={lista} />);
    const region = screen.getByRole('region', { name: 'Distribución por prioridad' });
    expect(within(region).getByText('Positivas').parentElement).toHaveTextContent('Positivas 1');
    expect(within(region).getByText('Alta').parentElement).toHaveTextContent('Alta 1');
    rerender(<MomentosDistribucion incidentes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('IncidentMeters', () => {
  it('enciende tantos puntos como el nivel', () => {
    const { container } = render(<IncidentMeters inc={lista[2]} />);
    expect(container.querySelectorAll('.tv-pips i.on')).toHaveLength(2);
  });
});
