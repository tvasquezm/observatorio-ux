import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalaDetallePage } from './SalaDetallePage';
import { useAuthStore } from '../../auth/store/useAuthStore';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), reset: vi.fn(), error: null as Error | null, saved: false, pending: false, equipos: [] as unknown[], sala: { id: 's1', nombre: 'Sala de Ana', periodo: '2026', profesor: { id: 'u1' }, permiteCreacionProyectos: true, permiteCreacionEquipos: true, limiteIntegrantesEquipo: 4 as number | null } }));
const lista = vi.hoisted(() => ({ proyectos: [] as unknown[] }));
vi.mock('../../projects/hooks/useProjectsQueries', () => ({ useProjects: () => ({ data: [] }), useCreateProject: () => ({ mutate: mocks.create, isPending: false }) }));
vi.mock('../hooks/useSalasQueries', () => ({
  useEstudiantes: () => ({ data: [] }), useAddEstudiante: () => ({ mutate: vi.fn() }), useAddEstudiantesBulk: () => ({ mutate: vi.fn() }), useRemoveEstudiante: () => ({ mutate: vi.fn() }),
  useSala: () => ({ data: mocks.sala }), useProyectosDeSala: () => ({ data: lista.proyectos }),
  useUpdateSala: () => ({ mutate: mocks.update, reset: mocks.reset, error: mocks.error, isSuccess: mocks.saved, isPending: mocks.pending }), useVincularProyecto: () => ({ mutate: vi.fn() }), useDesvincularProyecto: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../equipos/hooks/useEquiposQueries', () => ({
  useEquipos: () => ({ data: mocks.equipos }), useAccesosPendientes: () => ({ data: [] }), useResolverAcceso: () => ({ mutate: vi.fn(), isPending: false }), useCreateEquipo: () => ({ mutate: vi.fn() }), useUpdateEquipo: () => ({ mutate: vi.fn() }),
  useRemoveEquipo: () => ({ mutate: vi.fn() }), useAddMiembroEquipo: () => ({ mutate: vi.fn() }), useRemoveMiembroEquipo: () => ({ mutate: vi.fn() }),
}));
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.error = null; mocks.saved = false; mocks.pending = false; mocks.update.mockReset();
  mocks.sala.permiteCreacionProyectos = true; mocks.sala.limiteIntegrantesEquipo = 4; mocks.equipos = [];
  mocks.sala.profesor.id = 'u1';
  lista.proyectos = [];
  useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'DOCENTE' }, perspectiveRole: 'DOCENTE' });
});
function mount() {
  const router = createMemoryRouter([{ path: '/salas/:salaId', element: <SalaDetallePage /> }, { path: '/salas', element: <p>Mis salas</p> }, { path: '/proyectos/:id', element: <p>Proyecto abierto</p> }], { initialEntries: ['/salas/s1'] });
  return { ...render(<RouterProvider router={router} />), router };
}
describe('creación de proyectos desde la sala', () => {
  it.each(['DOCENTE', 'ESTUDIANTE'] as const)('crea como %s con la sala fija', async rol => {
    useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol }, perspectiveRole: rol });
    mount();
    expect(screen.queryByText('Esta sala no permite que los estudiantes creen proyectos. Pídele a tu docente que lo habilite.')).toBeNull();
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
    expect(screen.getByRole('note')).toHaveTextContent('Esta sala no permite que los estudiantes creen proyectos. Pídele a tu docente que lo habilite.');
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
  it('guarda al cambiar la casilla y refleja la respuesta al regresar desde Estudiantes', async () => {
    mocks.sala.permiteCreacionProyectos = false;
    mocks.update.mockImplementation(() => {
      mocks.pending = true;
      useAuthStore.setState({ perspectiveRole: 'DOCENTE' });
    });
    mount();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' }));
    expect(mocks.update).toHaveBeenCalledWith({ permiteCreacionProyectos: true });
    expect(screen.queryByRole('button', { name: 'Guardar configuración' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Estudiantes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Proyectos' }));
    expect(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' })).toBeDisabled();
    act(() => {
      mocks.pending = false;
      mocks.saved = true;
      mocks.sala.permiteCreacionProyectos = true;
      useAuthStore.setState({ perspectiveRole: 'DOCENTE' });
    });
    expect(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
  });
  it('revierte el valor y deja un error visible cuando el servidor rechaza el guardado', async () => {
    mocks.update.mockImplementation(() => {
      mocks.error = new Error('Sin permiso');
      useAuthStore.setState({ perspectiveRole: 'DOCENTE' });
    });
    mount();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' }));
    expect(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' })).toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent('Sin permiso');
  });
  it('permite navegar después del cambio con guardado automático', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = mount();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Permitir que los estudiantes creen proyectos en esta sala' }));
    await userEvent.click(screen.getByRole('link', { name: /Volver a mis salas/ }));
    expect(confirm).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/salas');
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

const proyecto = (i: number, extra: Record<string, unknown> = {}) => ({ id: 'p' + i, nombre: 'Proyecto ' + String(i).padStart(2, '0'), descripcion: null, _count: { sesiones: 0, artefactos: 0, miembros: 1 }, ultimaActividad: null, ...extra });
const nombres = () => screen.getAllByRole('row').slice(1).map(r => r.querySelector('th a')?.textContent);

describe('proyectos dentro de la sala', () => {
  it('muestra primero una tabla compacta con indicadores y enlace a Proyectos filtrado; la gestión queda plegada', () => {
    lista.proyectos = [
      proyecto(1, { nombre: 'Portal', _count: { sesiones: 2, artefactos: 4, miembros: 3 }, ultimaActividad: '2026-11-12T15:00:00Z' }),
      proyecto(2, { nombre: 'Biblioteca', descripcion: 'App' }),
    ];
    mount();
    expect(screen.getByRole('heading', { name: /Proyectos de la sala/ })).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Portal' })).toHaveAttribute('href', '/proyectos/p1');
    const fila = screen.getByRole('link', { name: 'Portal' }).closest('tr')!;
    expect([...fila.querySelectorAll('td')].map(td => td.textContent)).toEqual(['3', '2', '4', expect.stringMatching(/2026/)]);
    expect(screen.getByText('Sin actividad')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver en Proyectos/ })).toHaveAttribute('href', '/proyectos?sala=s1');
    expect(screen.getByText('Gestionar proyectos de la sala').closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
  it('ordena por última actividad (lo vacío al final) y por cualquier columna al hacer clic', async () => {
    lista.proyectos = [
      proyecto(1, { nombre: 'Alfa', ultimaActividad: '2026-10-01T10:00:00Z', _count: { sesiones: 5, artefactos: 0, miembros: 1 } }),
      proyecto(2, { nombre: 'Beta', ultimaActividad: '2026-11-01T10:00:00Z' }),
      proyecto(3, { nombre: 'Gamma' }),
    ];
    mount();
    expect(nombres()).toEqual(['Beta', 'Alfa', 'Gamma']);
    const tabla = within(screen.getByRole('table'));
    await userEvent.click(tabla.getByRole('button', { name: /^Proyecto/ }));
    expect(nombres()).toEqual(['Alfa', 'Beta', 'Gamma']);
    expect(tabla.getByRole('columnheader', { name: /^Proyecto/ })).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(tabla.getByRole('button', { name: /Sesiones/ }));
    expect(nombres()).toEqual(['Alfa', 'Beta', 'Gamma']);
    await userEvent.click(tabla.getByRole('button', { name: /Última actividad/ }));
    await userEvent.click(tabla.getByRole('button', { name: /Última actividad/ }));
    expect(nombres()).toEqual(['Alfa', 'Beta', 'Gamma']);
  });
  it('abre el proyecto al hacer clic en cualquier parte de la fila', async () => {
    lista.proyectos = [proyecto(1, { nombre: 'Portal' })];
    const { router } = mount();
    await userEvent.click(screen.getByRole('link', { name: 'Portal' }).closest('tr')!.querySelectorAll('td')[1]);
    await waitFor(() => expect(router.state.location.pathname).toBe('/proyectos/p1'));
  });
  it('con muchos proyectos busca dentro de la sala y pagina con «Mostrar más»', async () => {
    lista.proyectos = Array.from({ length: 30 }, (_, i) => proyecto(i, i === 5 ? { nombre: 'Banco digital' } : {}));
    mount();
    expect(nombres()).toHaveLength(25);
    expect(screen.getByText('Mostrando 25 de 30')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar 5 más' }));
    expect(nombres()).toHaveLength(30);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar proyecto en esta sala' }), 'banco');
    expect(nombres()).toEqual(['Banco digital']);
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('Ningún proyecto coincide con la búsqueda.')).toBeInTheDocument();
  });
  it('Desvincular solo está en la gestión y pide confirmar', async () => {
    lista.proyectos = [proyecto(1, { nombre: 'Portal' }), proyecto(2, { nombre: 'Biblioteca' })];
    mount();
    expect(screen.queryByRole('button', { name: 'Desvincular' })).toBeInTheDocument();
    const gestion = screen.getByText('Gestionar proyectos de la sala').closest('details')!;
    expect(gestion).toContainElement(screen.getByRole('button', { name: 'Desvincular' }));
    expect(screen.getByRole('button', { name: 'Desvincular' })).toBeDisabled();
  });
});
