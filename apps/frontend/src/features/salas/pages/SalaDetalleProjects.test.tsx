import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalaDetallePage } from './SalaDetallePage';
import { useAuthStore } from '../../auth/store/useAuthStore';

const mocks = vi.hoisted(() => ({ create: vi.fn(), sala: { id: 's1', nombre: 'Sala de Ana', periodo: '2026', profesor: { id: 'u1' }, permiteCreacionProyectos: true } }));
vi.mock('../../projects/hooks/useProjectsQueries', () => ({ useProjects: () => ({ data: [] }), useCreateProject: () => ({ mutate: mocks.create, isPending: false }) }));
vi.mock('../hooks/useSalasQueries', () => ({
  useSala: () => ({ data: mocks.sala }), useProyectosDeSala: () => ({ data: [] }),
  useUpdateSala: () => ({ mutate: vi.fn() }), useVincularProyecto: () => ({ mutate: vi.fn() }), useDesvincularProyecto: () => ({ mutate: vi.fn() }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.sala.permiteCreacionProyectos = true;
  mocks.sala.profesor.id = 'u1';
  useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'DOCENTE' }, perspectiveRole: 'DOCENTE' });
});
function mount() {
  return render(<RouterProvider router={createMemoryRouter([{ path: '/salas/:salaId', element: <SalaDetallePage /> }], { initialEntries: ['/salas/s1'] })} />);
}
describe('creación de proyectos desde la sala', () => {
  it.each(['DOCENTE', 'ESTUDIANTE'] as const)('crea como %s con la sala fija', async rol => {
    useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol }, perspectiveRole: rol });
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto en esta sala' }));
    expect(screen.getByLabelText('Sala')).toHaveValue('Sala de Ana');
    expect(screen.getByLabelText('Sala')).toHaveAttribute('readonly');
    await userEvent.type(screen.getByLabelText('Nombre del proyecto'), 'Nuevo proyecto');
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));
    expect(mocks.create).toHaveBeenCalledWith({ nombre: 'Nuevo proyecto', descripcion: undefined, salaId: 's1' }, expect.any(Object));
  });
  it('oculta la creación al estudiante cuando la sala no la permite', () => {
    mocks.sala.permiteCreacionProyectos = false;
    useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'ESTUDIANTE' }, perspectiveRole: 'ESTUDIANTE' });
    mount();
    expect(screen.queryByRole('button', { name: 'Crear proyecto en esta sala' })).toBeNull();
  });
  it('oculta la creación al docente que no es dueño', () => {
    mocks.sala.profesor.id = 'otro';
    mount();
    expect(screen.queryByRole('button', { name: 'Crear proyecto en esta sala' })).toBeNull();
  });
  it('permite al administrador crear en una sala ajena', () => {
    mocks.sala.profesor.id = 'otro';
    useAuthStore.setState({ user: { id: 'admin', nombre: 'Admin', email: 'admin@utem.cl', rol: 'ADMIN' }, perspectiveRole: 'ADMIN' });
    mount();
    expect(screen.getByRole('button', { name: 'Crear proyecto en esta sala' })).toBeEnabled();
  });
});
