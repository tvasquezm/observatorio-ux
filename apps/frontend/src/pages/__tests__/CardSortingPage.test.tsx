import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { CardSortingPage } from '../CardSortingPage';

const state = vi.hoisted(() => ({ create: vi.fn() }));
const projectId = '11111111-1111-4111-8111-111111111111';
vi.mock('../../features/card-sorting/hooks/useCardSortingQueries', () => ({
  useCardSortingEstudiosByProyecto: () => ({ data: [], isLoading: false }),
  useCreateCardSortingSession: () => ({ mutate: state.create, isPending: false, error: null }),
}));

function configure(cards = 'Biblioteca\nCalendario') {
  render(<RouterProvider router={createMemoryRouter([{
    path: '/', element: <Outlet context={{ proyectoId: projectId }} />,
    children: [{ index: true, element: <CardSortingPage /> }],
  }])} />);
  fireEvent.click(screen.getByText('Nuevo estudio'));
  fireEvent.change(screen.getByLabelText('Nombre del estudio'), { target: { value: ' Navegación ' } });
  fireEvent.change(screen.getByLabelText('Tarjetas (una por línea)'), { target: { value: cards } });
}
function submit() {
  fireEvent.submit(screen.getByLabelText('Nombre del estudio').closest('form')!);
}
beforeEach(() => vi.clearAllMocks());

describe('Configuración de Card Sorting', () => {
  it('mantiene la configuración cerrada hasta que se necesita y conserva el borrador al plegarla', () => {
    configure();
    const summary = screen.getByText('Nuevo estudio');
    fireEvent.click(summary);
    expect(summary.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(summary);
    expect(screen.getByLabelText('Nombre del estudio')).toHaveValue(' Navegación ');
    expect(screen.getByLabelText('Tarjetas (una por línea)')).toHaveValue('Biblioteca\nCalendario');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
  it('explica el error y conserva las tarjetas repetidas para poder corregirlas', () => {
    configure('Biblioteca\n biblioteca ');
    submit();
    expect(state.create).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/tarjetas.*duplicadas/i);
    expect(screen.getByLabelText('Tarjetas (una por línea)')).toHaveValue('Biblioteca\n biblioteca ');
  });

  it('explica por qué no se puede crear un estudio cerrado sin categorías', () => {
    configure();
    fireEvent.change(screen.getByLabelText('Tipo de estudio'), { target: { value: 'CERRADO' } });
    submit();
    expect(state.create).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/categoría/i);
  });

  it('envía categorías y tarjetas sin espacios adicionales en un estudio cerrado', () => {
    configure(' Biblioteca \n\n Calendario ');
    fireEvent.change(screen.getByLabelText('Tipo de estudio'), { target: { value: 'CERRADO' } });
    fireEvent.change(screen.getByLabelText('Categorías predefinidas (una por línea)'), { target: { value: ' Servicios \n Vida universitaria ' } });
    submit();
    expect(state.create).toHaveBeenCalledWith({
      proyectoId: projectId, nombre: 'Navegación', tipo: 'CERRADO',
      tarjetas: [{ etiqueta: 'Biblioteca' }, { etiqueta: 'Calendario' }],
      categorias: [{ nombre: 'Servicios' }, { nombre: 'Vida universitaria' }],
    }, expect.any(Object));
  });

  it('omite las categorías al volver de cerrado a abierto', () => {
    configure();
    fireEvent.change(screen.getByLabelText('Tipo de estudio'), { target: { value: 'CERRADO' } });
    fireEvent.change(screen.getByLabelText('Categorías predefinidas (una por línea)'), { target: { value: 'Servicios' } });
    fireEvent.change(screen.getByLabelText('Tipo de estudio'), { target: { value: 'ABIERTO' } });
    submit();
    expect(state.create.mock.calls[0][0].categorias).toBeUndefined();
  });
});
