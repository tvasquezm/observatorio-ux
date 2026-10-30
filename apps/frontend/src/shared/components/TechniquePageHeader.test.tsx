import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TechniquePageHeader } from './TechniquePageHeader';

describe('instrucciones de una técnica', () => {
  it('arranca plegada y permite leer todos los pasos al abrirla', () => {
    const { container } = render(<TechniquePageHeader label="Técnica" title="Personas" description="Perfil" instructions={['Identifica el contexto', 'Sustenta con evidencia']} />);
    const summary = container.querySelector('summary')!;
    expect(summary).toHaveTextContent('Cómo trabajar con Personas');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Identifica el contexto')).not.toBeVisible();
    fireEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Identifica el contexto')).toBeVisible();
    expect(screen.getByText('Sustenta con evidencia')).toBeVisible();
  });
  it('acepta un nodo propio como instrucciones y también arranca plegado', () => {
    const { container } = render(<TechniquePageHeader label="Técnica" title="Card Sorting" description="Agrupa" instructions={<p>Guía propia</p>} />);
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(container.querySelectorAll('ol')).toHaveLength(0);
    fireEvent.click(container.querySelector('summary')!);
    expect(screen.getByText('Guía propia')).toBeVisible();
  });
});

describe('aviso de datos nuevos', () => {
  const texto = 'Si otra persona del equipo cambia algo, actualiza la página para ver los datos nuevos.';
  it('se muestra por defecto', () => {
    render(<TechniquePageHeader label="Técnica" title="Personas" description="Perfil" />);
    expect(screen.getByText(texto)).toBeInTheDocument();
  });
  it('se puede apagar', () => {
    render(<TechniquePageHeader label="Técnica" title="Personas" description="Perfil" avisoActualizar={false} />);
    expect(screen.queryByText(texto)).toBeNull();
  });
});
