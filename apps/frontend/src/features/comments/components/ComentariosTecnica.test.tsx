import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComentariosTecnica } from './ComentariosTecnica';

const panel = vi.hoisted(() => vi.fn());

vi.mock('./ComentariosPanel', () => ({
  ComentariosPanel: (props: unknown) => {
    panel(props);
    return <div data-testid="panel" />;
  },
}));

function abrir() {
  const details = screen.getByText('Comentarios de Personas').closest('details') as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event('toggle'));
}

describe('ComentariosTecnica', () => {
  it('cerrado no monta el panel', () => {
    panel.mockClear();
    render(<MemoryRouter><ComentariosTecnica proyectoId="p1" tecnica="personas" /></MemoryRouter>);
    expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    expect(panel).not.toHaveBeenCalled();
  });

  it('abierto monta el panel filtrado y publicando en la tecnica', () => {
    panel.mockClear();
    render(<MemoryRouter><ComentariosTecnica proyectoId="p1" tecnica="personas" /></MemoryRouter>);
    abrir();
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    expect(panel).toHaveBeenCalledWith({ proyectoId: 'p1', filtro: 'personas', publicarEn: 'personas' });
  });

  it('enlaza a Comentarios filtrado por la tecnica', () => {
    render(<MemoryRouter><ComentariosTecnica proyectoId="p1" tecnica="journey-map" /></MemoryRouter>);
    const details = screen.getByText('Comentarios de Journey Map').closest('details') as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(screen.getByRole('link', { name: 'Ver en Comentarios' })).toHaveAttribute(
      'href',
      '/proyectos/p1/comentarios?tecnica=journey-map',
    );
  });
});
