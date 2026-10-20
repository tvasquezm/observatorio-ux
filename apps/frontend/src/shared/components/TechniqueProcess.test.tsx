import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TechniqueProcess, type ProcessStep } from './TechniqueProcess';

const steps: ProcessStep[] = [
  { id: 'a', label: 'Perfil', detail: 'Ana', done: true },
  { id: 'b', label: 'Fases', detail: '2 fases', done: false },
  { id: 'c', label: 'Evidencia', done: false },
];

describe('TechniqueProcess', () => {
  it('muestra solo la fase actual y deja la lista completa para lectores de pantalla', () => {
    render(<TechniqueProcess steps={steps} title="Proceso demo" />);
    expect(screen.getByRole('region', { name: 'Proceso demo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1 de 3' })).toBeInTheDocument();
    expect(screen.getByText('Fase 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('2 fases')).toBeInTheDocument();
    expect(document.querySelector('.tv-process-fase')).toHaveTextContent('Fases');
    expect(document.querySelector('.tv-process-fase')).not.toHaveTextContent('Perfil');
    expect(document.querySelector('.tv-process-fase')).not.toHaveTextContent('Evidencia');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).not.toHaveAttribute('aria-current');
  });

  it('reemplaza la fase anterior por la siguiente al avanzar', () => {
    const { rerender } = render(<TechniqueProcess steps={steps} />);
    expect(screen.getByText('Fase 2 de 3')).toBeInTheDocument();
    rerender(
      <TechniqueProcess steps={steps.map((step, i) => ({ ...step, done: i < 2 }))} />,
    );
    expect(screen.queryByText('Fase 2 de 3')).not.toBeInTheDocument();
    expect(screen.getByText('Fase 3 de 3')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2 de 3' })).toBeInTheDocument();
  });

  it('no marca ninguno como actual cuando todo está completo', () => {
    render(<TechniqueProcess steps={steps.map((step) => ({ ...step, done: true }))} />);
    expect(screen.getByRole('img', { name: '3 de 3, completo' })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Técnica completa y lista para usar');
    expect(document.querySelector('.tv-process-fase')).toBeNull();
    expect(screen.getByRole('region')).toHaveClass('tv-process--listo');
  });

  it('permite un texto propio al estar lista', () => {
    render(<TechniqueProcess steps={steps.map((step) => ({ ...step, done: true }))} textoListo="Persona lista" />);
    expect(screen.getByRole('status')).toHaveTextContent('Persona lista');
  });

  it('aplica la variante compacta', () => {
    render(<TechniqueProcess steps={steps} compact />);
    expect(screen.getByRole('region')).toHaveClass('tv-process--compact');
  });
});
