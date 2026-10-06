import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsPage } from '../ProjectsPage';
import { ConfirmDialog } from '../../shared/components/ui/ConfirmDialog';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
  query: { data: [] as unknown[], isLoading: false, isError: false },
}));

vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({
  useProjects: () => ({ ...mocks.query, refetch: mocks.refetch }),
  useCreateProject: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateProject: () => ({ mutate: mocks.update, isPending: false }),
}));

vi.mock('../../features/salas/hooks/useSalasQueries', () => ({
  useSalas: () => ({ data: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query = { data: [], isLoading: false, isError: false };
});

describe('ProjectsPage — creación centralizada', () => {
  it('diferencia un fallo de carga de una lista vacía y permite reintentar', async () => {
    mocks.query.isError = true;
    render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <ProjectsPage /> }])} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tus proyectos');
    expect(screen.queryByText('0 en total')).not.toBeInTheDocument();
    expect(screen.queryByText('No hay proyectos todavía.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
  it('protege el borrador tanto desde Cancelar como desde el botón que oculta el editor', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <><ProjectsPage /><ConfirmDialog /></> }])} />);
    const trigger = screen.getByRole('button', { name: 'Nuevo proyecto' });
    await userEvent.click(trigger);
    await userEvent.type(screen.getByLabelText('Nombre del proyecto'), 'Mi evidencia');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('Mi evidencia');
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
    await waitFor(() => expect(screen.queryByLabelText('Nombre del proyecto')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it('muestra un solo acceso y revela el formulario únicamente al solicitarlo', async () => {
    render(
      <RouterProvider router={createMemoryRouter([{ path: '*', element: <ProjectsPage /> }])} />,
    );

    const abrir = screen.getByRole('button', { name: 'Nuevo proyecto' });
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('heading', { name: 'Crear proyecto' })).not.toBeInTheDocument();

    await userEvent.click(abrir);

    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Crear proyecto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del proyecto')).toHaveFocus();
  });

  it('envía los datos desde el formulario compacto', async () => {
    render(
      <RouterProvider router={createMemoryRouter([{ path: '*', element: <ProjectsPage /> }])} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo proyecto' }));
    await userEvent.type(screen.getByLabelText('Nombre del proyecto'), 'Investigación móvil');
    await userEvent.type(screen.getByLabelText('Descripción del proyecto (opcional)'), 'Flujo de matrícula');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(mocks.create).toHaveBeenCalledWith(
      { nombre: 'Investigación móvil', descripcion: 'Flujo de matrícula' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
