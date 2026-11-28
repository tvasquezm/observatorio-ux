import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectMembersPage } from '../ProjectMembersPage';
import { useAuthStore } from '../../features/auth/store/useAuthStore';

const mocks = vi.hoisted(() => ({ guardar: vi.fn(), proyecto: { id: 'p1', nombre: 'Portal', creadoPorId: 'u1', nombreEquipo: null as string | null } }));
vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({
  useProject: () => ({ data: mocks.proyecto }),
  useMembers: () => ({ data: [], isLoading: false, isError: false }),
  useAddMember: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveMember: () => ({ mutate: vi.fn() }),
  useUpdateProject: () => ({ mutate: mocks.guardar, isPending: false }),
}));

function montar() {
  const router = createMemoryRouter([{ element: <Outlet context={{ proyectoId: 'p1' }} />, children: [{ path: '/', element: <ProjectMembersPage /> }] }]);
  return render(<RouterProvider router={router} />);
}

describe('nombre del equipo en Miembros', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.proyecto.nombreEquipo = null; });

  it.each(['ESTUDIANTE', 'DOCENTE'] as const)('%s puede ponerle o cambiarle el nombre al equipo', async (rol) => {
    useAuthStore.setState({ user: { id: rol === 'ESTUDIANTE' ? 'u1' : 'd1', nombre: 'Ana', email: 'ana@utem.cl', rol }, perspectiveRole: rol });
    montar();
    const guardar = screen.getByRole('button', { name: 'Guardar nombre' });
    expect(guardar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Nombre del equipo'), '  Los Pioneros ');
    await userEvent.click(guardar);
    expect(mocks.guardar).toHaveBeenCalledWith({ id: 'p1', data: { nombreEquipo: 'Los Pioneros' } }, expect.any(Object));
  });

  it('muestra el nombre actual y permite dejarlo vacío', async () => {
    mocks.proyecto.nombreEquipo = 'Los Pioneros';
    useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'ESTUDIANTE' }, perspectiveRole: 'ESTUDIANTE' });
    montar();
    expect(screen.getByLabelText('Nombre del equipo')).toHaveValue('Los Pioneros');
    await userEvent.clear(screen.getByLabelText('Nombre del equipo'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }));
    expect(mocks.guardar).toHaveBeenCalledWith({ id: 'p1', data: { nombreEquipo: '' } }, expect.any(Object));
  });
});
