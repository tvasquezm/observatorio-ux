import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TechniquePageHeader } from './TechniquePageHeader';

describe('instrucciones de una técnica', () => {
  it('presenta pasos ordenados abiertos y permite contraerlos', () => {
    const { container } = render(<TechniquePageHeader label="Técnica" title="Persona" description="Perfil" instructions={['Identifica el contexto', 'Sustenta con evidencia']} />);
    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Identifica el contexto')).toBeVisible();
    expect(container.querySelector('summary')).toHaveTextContent('Cómo trabajar con Persona');
  });
  it('permite comenzar plegadas y leer todos los pasos al abrirlas', () => {
    const { container } = render(<TechniquePageHeader label="Técnica" title="Personas" description="Perfil" instructions={['Identifica el contexto', 'Sustenta con evidencia']} instructionsInitiallyOpen={false} />);
    const summary = container.querySelector('summary')!;
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Identifica el contexto')).not.toBeVisible();
    fireEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(screen.getByText('Identifica el contexto')).toBeVisible();
    expect(screen.getByText('Sustenta con evidencia')).toBeVisible();
  });
});
