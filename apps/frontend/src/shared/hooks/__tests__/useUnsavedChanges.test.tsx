import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChanges } from '../useUnsavedChanges';

function Editor() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  useUnsavedChanges(open, value);
  return <><button onClick={() => setOpen(true)}>Editar</button><input aria-label="Contenido" value={value} onChange={(event) => setValue(event.target.value)} /></>;
}

afterEach(() => vi.restoreAllMocks());

describe('cambios sin guardar', () => {
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
