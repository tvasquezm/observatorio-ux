import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalaDetallePage } from './SalaDetallePage';
import { useAuthStore } from '../../auth/store/useAuthStore';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), error: null as Error | null, saved: false, equipos: [] as unknown[], sala: { id: 's1', nombre: 'Sala de Ana', periodo: '2026', profesor: { id: 'u1' }, permiteCreacionProyectos: true, permiteCreacionEquipos: true, limiteIntegrantesEquipo: 4 as number | null } }));
vi.mock('../../projects/hooks/useProjectsQueries', () => ({ useProjects: () => ({ data: [] }), useCreateProject: () => ({ mutate: mocks.create, isPending: false }) }));
vi.mock('../hooks/useSalasQueries', () => ({
  useEstudiantes: () => ({ data: [] }), useAddEstudiante: () => ({ mutate: vi.fn() }), useAddEstudiantesBulk: () => ({ mutate: vi.fn() }), useRemoveEstudiante: () => ({ mutate: vi.fn() }),
  useSala: () => ({ data: mocks.sala }), useProyectosDeSala: () => ({ data: [] }),
  useUpdateSala: () => ({ mutate: mocks.update, error: mocks.error, isSuccess: mocks.saved, isPending: false }), useVincularProyecto: () => ({ mutate: vi.fn() }), useDesvincularProyecto: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../equipos/hooks/useEquiposQueries', () => ({
  useEquipos: () => ({ data: mocks.equipos }), useCreateEquipo: () => ({ mutate: vi.fn() }), useUpdateEquipo: () => ({ mutate: vi.fn() }),
  useRemoveEquipo: () => ({ mutate: vi.fn() }), useAddMiembroEquipo: () => ({ mutate: vi.fn() }), useRemoveMiembroEquipo: () => ({ mutate: vi.fn() }),
}));
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.error = null; mocks.saved = false; mocks.update.mockReset();
  mocks.sala.permiteCreacionProyectos = true; mocks.sala.limiteIntegrantesEquipo = 4; mocks.equipos = [];
  mocks.sala.profesor.id = 'u1';
  useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'DOCENTE' }, perspectiveRole: 'DOCENTE' });
});
function mount() {
  const router = createMemoryRouter([{ path: '/salas/:salaId', element: <SalaDetallePage /> }, { path: '/salas', element: <p>Mis salas</p> }], { initialEntries: ['/salas/s1'] });
  return { ...render(<RouterProvider router={router} />), router };
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


describe('configuración persistida y cambios sin guardar', () => {
  it('muestra el valor nuevo del servidor sin conservar el estado inicial del toggle', () => {
    mount();
    expect(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' })).toBeChecked();
    act(() => { mocks.sala.permiteCreacionProyectos = false; useAuthStore.setState({ perspectiveRole: 'DOCENTE' }); });
    expect(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' })).not.toBeChecked();
  });
  it('envía el valor al PATCH y muestra la confirmación del guardado', async () => {
    mocks.update.mockImplementation((value, options) => { mocks.sala.permiteCreacionProyectos = value.permiteCreacionProyectos; mocks.saved = true; options?.onSuccess?.(); });
    mount();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(mocks.update).toHaveBeenCalledWith({ permiteCreacionProyectos: false }, expect.any(Object));
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
  });
  it('revierte el valor y deja un error visible cuando el servidor rechaza el guardado', async () => {
    mocks.update.mockImplementation((_value, options) => { mocks.error = new Error('Sin permiso'); options?.onError?.(mocks.error); });
    mount();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' })).toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent('Sin permiso');
  });
  it('protege la navegación con cambios de configuración', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = mount();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' }));
    await userEvent.click(screen.getByRole('link', { name: /Volver a mis salas/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(router.state.location.pathname).toBe('/salas/s1');
  });
  it('no pide confirmación cuando no se han editado campos', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = mount();
    await userEvent.click(screen.getByRole('link', { name: /Volver a mis salas/ }));
    expect(router.state.location.pathname).toBe('/salas');
    expect(confirm).not.toHaveBeenCalled();
  });
});


describe('borradores de estudiantes y equipos', () => {
  it.each([
    ['Estudiantes', 'Email del estudiante'],
    ['Equipos', 'Nombre del nuevo equipo'],
    ['Equipos', 'Email del estudiante a agregar'],
  ])('protege %s: %s al navegar', async (tab, campo) => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mocks.equipos = [{ id: 'eq1', nombre: 'Equipo 1', miembros: [] }];
    const { router } = mount();
    await userEvent.click(screen.getByRole('button', { name: tab }));
    await userEvent.type(screen.getByLabelText(campo), 'pendiente');
    await userEvent.click(screen.getByRole('link', { name: /Volver a mis salas/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(router.state.location.pathname).toBe('/salas/s1');
  });
  it('envía null para quitar un límite al dejarlo vacío', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Equipos' }));
    await userEvent.clear(screen.getByLabelText(/Límite de integrantes/));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));
    expect(mocks.update).toHaveBeenCalledWith({ permiteCreacionEquipos: true, limiteIntegrantesEquipo: null }, expect.any(Object));
  });
});
