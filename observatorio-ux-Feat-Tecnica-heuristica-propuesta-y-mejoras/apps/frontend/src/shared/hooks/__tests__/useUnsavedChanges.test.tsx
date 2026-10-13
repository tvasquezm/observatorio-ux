import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChanges } from '../useUnsavedChanges';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

function Editor() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  useUnsavedChanges(open, value);
  return <><button onClick={() => setOpen(true)}>Editar</button><input aria-label="Contenido" value={value} onChange={(event) => setValue(event.target.value)} /></>;
}

afterEach(() => vi.restoreAllMocks());

describe('cambios sin guardar', () => {
  it('conserva un borrador al cancelar el descarte y solo cierra al confirmarlo', async () => {
    function Draft() {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState('');
      const { confirmDiscard } = useUnsavedChanges(open, value);
      return <><ConfirmDialog />{open && <input aria-label="Borrador" value={value} onChange={e => setValue(e.target.value)} />}<button onClick={async () => { if (await confirmDiscard()) setOpen(false); }}>Cerrar editor</button></>;
    }
    render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <Draft /> }])} />);
    fireEvent.change(screen.getByLabelText('Borrador'), { target: { value: 'Evidencia' } });
    await act(async () => { fireEvent.click(screen.getByText('Cerrar editor')); });
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Seguir editando' })); });
    expect(screen.getByLabelText('Borrador')).toHaveValue('Evidencia');
    fireEvent.click(screen.getByText('Cerrar editor'));
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
    await waitFor(() => expect(screen.queryByLabelText('Borrador')).not.toBeInTheDocument());
  });
  it('permite salir sin cambios y protege Atrás manteniendo el formulario al cancelar', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = createMemoryRouter([{ path: '/inicio', element: <p>Inicio</p> }, { path: '/editar', element: <Editor /> }], { initialEntries: ['/inicio', '/editar'], initialIndex: 1 });
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Editar'));
    await act(() => router.navigate(-1));
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();

    await act(() => router.navigate(1));
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.change(screen.getByLabelText('Contenido'), { target: { value: 'Evidencia pendiente' } });
    await act(() => router.navigate(-1));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('Contenido')).toHaveValue('Evidencia pendiente');
    expect(router.state.location.pathname).toBe('/editar');

    confirm.mockReturnValue(true);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(screen.getByText('Inicio')).toBeInTheDocument());
  });
});
