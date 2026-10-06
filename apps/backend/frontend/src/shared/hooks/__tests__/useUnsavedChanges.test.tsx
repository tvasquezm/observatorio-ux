import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChanges } from '../useUnsavedChanges';

const mocks = vi.hoisted(() => ({ askConfirm: vi.fn<(message: string) => Promise<boolean>>() }));

vi.mock('../../api/confirm', () => ({ askConfirm: mocks.askConfirm }));

function Editor() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  useUnsavedChanges(open, value);
  return <><button onClick={() => setOpen(true)}>Editar</button><input aria-label="Contenido" value={value} onChange={(event) => setValue(event.target.value)} /></>;
}

function makeRouter() {
  return createMemoryRouter([{ path: '/inicio', element: <p>Inicio</p> }, { path: '/editar', element: <Editor /> }], { initialEntries: ['/inicio', '/editar'], initialIndex: 1 });
}

beforeEach(() => mocks.askConfirm.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('cambios sin guardar', () => {
  it('permite salir sin cambios y protege Atrás con el modal propio, manteniendo el formulario al cancelar', async () => {
    mocks.askConfirm.mockResolvedValue(false);
    const router = makeRouter();
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Editar'));
    await act(() => router.navigate(-1));
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(mocks.askConfirm).not.toHaveBeenCalled();

    await act(() => router.navigate(1));
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.change(screen.getByLabelText('Contenido'), { target: { value: 'Evidencia pendiente' } });
    await act(() => router.navigate(-1));
    await waitFor(() => expect(mocks.askConfirm).toHaveBeenCalledOnce());
    expect(screen.getByLabelText('Contenido')).toHaveValue('Evidencia pendiente');
    expect(router.state.location.pathname).toBe('/editar');

    mocks.askConfirm.mockResolvedValue(true);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(screen.getByText('Inicio')).toBeInTheDocument());
    expect(mocks.askConfirm).toHaveBeenCalledTimes(2);
  });

  it('tras cancelar, un segundo intento de salir vuelve a preguntar', async () => {
    mocks.askConfirm.mockResolvedValue(false);
    const router = makeRouter();
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.change(screen.getByLabelText('Contenido'), { target: { value: 'Borrador' } });

    await act(() => router.navigate(-1));
    await waitFor(() => expect(mocks.askConfirm).toHaveBeenCalledTimes(1));
    await act(() => router.navigate(-1));
    await waitFor(() => expect(mocks.askConfirm).toHaveBeenCalledTimes(2));
    expect(router.state.location.pathname).toBe('/editar');
  });
});
