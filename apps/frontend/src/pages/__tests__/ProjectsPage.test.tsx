import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsPage } from '../ProjectsPage';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({
  useProjects: () => ({ data: [], isLoading: false }),
  useCreateProject: () => ({ mutate: mocks.create, isPending: false }),
  useUpdateProject: () => ({ mutate: mocks.update, isPending: false }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProjectsPage — creación centralizada', () => {
  it('muestra un solo acceso y revela el formulario únicamente al solicitarlo', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
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
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo proyecto' }));
    await userEvent.type(screen.getByLabelText('Nombre del proyecto'), 'Investigación móvil');
    await userEvent.type(screen.getByLabelText('Descripción del proyecto'), 'Flujo de matrícula');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(mocks.create).toHaveBeenCalledWith(
      { nombre: 'Investigación móvil', descripcion: 'Flujo de matrícula' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
