import { render, screen } from '@testing-library/react';
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
});
