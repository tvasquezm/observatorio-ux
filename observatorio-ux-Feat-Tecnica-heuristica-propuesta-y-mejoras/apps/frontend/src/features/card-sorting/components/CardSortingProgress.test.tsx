import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardSortingProgress, type ProgressStep } from './CardSortingProgress';

const steps: ProgressStep[] = [
  { id: 'nombre', label: 'Nombre', detail: 'Demo', done: true },
  { id: 'tarjetas', label: 'Tarjetas', detail: '0', done: false },
  { id: 'preguntas', label: 'Preguntas', detail: '0 de 5', done: false, optional: true },
];

describe('CardSortingProgress', () => {
  it('cuenta solo los pasos obligatorios y expone la barra', () => {
    render(<CardSortingProgress steps={steps} problem="Agrega al menos una tarjeta." />);
    expect(screen.getByTestId('cs-progress-count')).toHaveTextContent('1 de 2');
    expect(screen.getByRole('progressbar', { name: 'Avance del estudio' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Preguntas (opcional)')).toBeInTheDocument();
  });

  it('muestra lo que falta y, sin problema, "Listo para crear"', () => {
    const { rerender } = render(<CardSortingProgress steps={steps} problem="Agrega al menos una tarjeta." />);
    expect(screen.getByTestId('cs-progress-status')).toHaveTextContent('Agrega al menos una tarjeta.');
    rerender(<CardSortingProgress steps={steps} problem={null} />);
    expect(screen.getByTestId('cs-progress-status')).toHaveTextContent('Listo para crear.');
  });
});
