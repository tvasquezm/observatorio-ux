import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TechniqueProcess, type ProcessStep } from './TechniqueProcess';

const steps: ProcessStep[] = [
  { id: 'a', label: 'Perfil', detail: 'Ana', done: true },
  { id: 'b', label: 'Fases', detail: '2 fases', done: false },
  { id: 'c', label: 'Evidencia', done: false },
];

describe('TechniqueProcess', () => {
  it('cuenta los pasos completos y marca el primero pendiente como actual', () => {
    render(<TechniqueProcess steps={steps} title="Proceso demo" />);
    expect(screen.getByRole('region', { name: 'Proceso demo' })).toBeInTheDocument();
    expect(screen.getByTestId('tv-process-count')).toHaveTextContent('1 de 3');
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).not.toHaveAttribute('aria-current');
  });

  it('no marca ninguno como actual cuando todo está completo', () => {
    render(<TechniqueProcess steps={steps.map((step) => ({ ...step, done: true }))} />);
    expect(screen.getByTestId('tv-process-count')).toHaveTextContent('3 de 3');
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
  });

  it('aplica la variante compacta', () => {
    render(<TechniqueProcess steps={steps} compact />);
    expect(screen.getByRole('region')).toHaveClass('tv-process--compact');
  });
});
