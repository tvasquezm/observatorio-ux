import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SalaDetallePage } from './SalaDetallePage';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { SalasApiError } from '../api/salas.api';
import { useAuthStore } from '../../auth/store/useAuthStore';

const salaQuery = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false, isError: true, error: null as Error | null, refetch: vi.fn() }));
const proyectosSala = vi.hoisted(() => ({ lista: [] as unknown[] }));
const update = vi.hoisted(() => vi.fn());
const reset = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useSalasQueries', () => ({
  useSala: () => salaQuery,
  useUpdateSala: () => ({ mutateAsync: update, reset }),
  useProyectosDeSala: () => ({ data: proyectosSala.lista }),
  useVincularProyecto: () => ({ mutate: vi.fn() }),
  useDesvincularProyecto: () => ({ mutate: vi.fn() }),
  useEstudiantes: () => ({ data: [] }),
  useAddEstudiante: () => ({ mutate: vi.fn() }),
  useAddEstudiantesBulk: () => ({ mutate: vi.fn() }),
  useRemoveEstudiante: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../projects/hooks/useProjectsQueries', () => ({
  useProjects: () => ({ data: [] }),
  useCreateProject: () => ({ mutate: vi.fn(), isPending: false }),
}));
const equipos = vi.hoisted(() => ({ lista: [] as unknown[], remove: vi.fn(), pendientes: [] as unknown[], historial: [] as unknown[], resolver: vi.fn() }));
vi.mock('../../equipos/hooks/useEquiposQueries', () => ({
  useEquipos: () => ({ data: equipos.lista }),
  useAccesosPendientes: () => ({ data: equipos.pendientes }),
  useResolverAcceso: () => ({ mutate: equipos.resolver, isPending: false }),
  useHistorialAccesos: () => ({ data: equipos.historial }),
  useCreateEquipo: () => ({ mutate: vi.fn() }),
  useUpdateEquipo: () => ({ mutate: vi.fn() }),
  useRemoveEquipo: () => ({ mutate: equipos.remove }),
  useAddMiembroEquipo: () => ({ mutate: vi.fn() }),
  useRemoveMiembroEquipo: () => ({ mutate: vi.fn() }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

beforeEach(() => {
  update.mockReset();
  equipos.remove.mockReset();
  equipos.lista = [];
  equipos.pendientes = [];
  equipos.historial = [];
  equipos.resolver.mockReset();
  proyectosSala.lista = [];
  salaQuery.data = undefined;
  salaQuery.isError = true;
  salaQuery.error = new SalasApiError(403, 'No estás asignado a esta sala. Pide a tu docente que registre el correo de tu cuenta.');
  useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'ESTUDIANTE' }, perspectiveRole: 'ESTUDIANTE' });
});

function setup() {
  return render(<RouterProvider router={createMemoryRouter([{ path: '/salas/:salaId', element: <><SalaDetallePage /><ConfirmDialog /></> }], { initialEntries: ['/salas/s1'] })} />);
}

function salaDe(rol: 'DOCENTE' | 'ADMIN', id: string, profesorId: string) {
  useAuthStore.setState({ user: { id, nombre: 'Ana', email: 'ana@utem.cl', rol }, perspectiveRole: rol });
  salaQuery.isError = false;
  salaQuery.error = null;
  salaQuery.data = {
    id: 's1',
    nombre: 'Sala de Ana',
    periodo: '2026-2',
    instrucciones: 'Trabajo semanal',
    fechaInicio: '2026-09-10T12:00:00.000Z',
    fechaFin: '2026-12-10T12:00:00.000Z',
    createdAt: '2026-09-01T12:00:00.000Z',
    profesor: { id: profesorId, nombre: 'Docente', email: 'docente@ux.cl', rol: 'DOCENTE' },
    permiteCreacionProyectos: false,
    permiteCreacionEquipos: false,
    limiteIntegrantesEquipo: null,
  };
}

describe('acceso a una sala', () => {
  it('mantiene una explicación y una salida visibles para el estudiante no asignado', () => {
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent('No estás asignado');
    expect(screen.getByRole('alert')).toHaveTextContent('ana@utem.cl');
    expect(screen.getByRole('link', { name: 'Ver mis salas' })).toHaveAttribute('href', '/salas');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(salaQuery.refetch).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeVisible();
  });
  it('distingue un fallo del servidor y oculta contenido cacheado al perder acceso', () => {
    salaQuery.error = new SalasApiError(503, 'Servidor no disponible');
    salaQuery.data = { nombre: 'Sala cacheada' };
    setup();
    expect(screen.getByRole('heading', { name: 'No se pudo abrir la sala' })).toBeVisible();
    expect(screen.queryByText('Sala cacheada')).toBeNull();
    expect(screen.queryByText(/Solicita la asignación/)).toBeNull();
  });
});

describe('edición de la sala desde su detalle', () => {
  it('muestra "Editar sala" al docente dueño y al administrador', () => {
    salaDe('DOCENTE', 'u1', 'u1');
    setup();
    expect(screen.getByRole('button', { name: 'Editar sala' })).toBeVisible();
  });

  it('lo oculta al estudiante y al docente que no es dueño', () => {
    salaDe('DOCENTE', 'u2', 'u1');
    const primero = setup();
    expect(screen.queryByRole('button', { name: 'Editar sala' })).toBeNull();
    primero.unmount();
    salaDe('DOCENTE', 'u1', 'otro');
    setup();
    expect(screen.queryByRole('button', { name: 'Editar sala' })).toBeNull();
  });

  it('guarda los cambios y el encabezado muestra el nombre nuevo', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    update.mockImplementation(async payload => {
      salaQuery.data = { ...(salaQuery.data as Record<string, unknown>), ...payload };
      return salaQuery.data;
    });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Editar sala' }));
    const nombre = screen.getByLabelText('Nombre de la sala');
    expect(nombre).toHaveValue('Sala de Ana');
    fireEvent.change(nombre, { target: { value: 'Sala corregida' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Sala corregida', periodo: '2026-2' }));
    expect(await screen.findByRole('heading', { name: /Sala corregida/ })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra dentro del formulario el error de fechas y no guarda', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Editar sala' }));
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '2026-11-20T10:00' } });
    fireEvent.change(screen.getByLabelText('Término'), { target: { value: '2026-11-19T10:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByRole('alert')).toHaveTextContent('La fecha de término debe ser posterior a la fecha de inicio.');
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('muestra en el formulario el rechazo del servidor', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    update.mockRejectedValue(new SalasApiError(403, 'No tienes permiso para editar esta sala.'));
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Editar sala' }));
    fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Otra' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para editar esta sala.');
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('pide una sola vez descartar los cambios al cerrar el formulario', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    const pedidos: string[] = [];
    const escuchar = (event: Event) => {
      pedidos.push((event as CustomEvent<{ message: string }>).detail.message);
    };
    window.addEventListener('app:confirm', escuchar);
    try {
      setup();
      await userEvent.click(screen.getByRole('button', { name: 'Editar sala' }));
      fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Cambio sin guardar' } });
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(pedidos).toHaveLength(1);
      expect(pedidos[0]).toContain('cambios sin guardar');
      await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
      expect(pedidos).toHaveLength(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    } finally {
      window.removeEventListener('app:confirm', escuchar);
    }
  });

  it('pide escribir el nombre del equipo antes de eliminarlo', async () => {
    salaDe('ADMIN', 'u1', 'u1');
    equipos.lista = [{ id: 'eq1', nombre: 'Equipo Rojo', salaId: 's1', miembros: [] }];
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Equipos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const campo = screen.getByLabelText('Escribe «Equipo Rojo» para confirmar');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(equipos.remove).not.toHaveBeenCalled();
    await userEvent.type(campo, 'Equipo Rojo');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(equipos.remove).toHaveBeenCalledWith('eq1'));
  });
});

describe('insignia «Solo lectura» en los proyectos de la sala', () => {
  it('solo aparece en los proyectos que el estudiante no puede trabajar, aunque la sala permita crear', () => {
    salaDe('DOCENTE', 'u1', 'u1');
    useAuthStore.setState({ user: { id: 'u9', nombre: 'Eva', email: 'eva@utem.cl', rol: 'ESTUDIANTE' }, perspectiveRole: 'ESTUDIANTE' });
    (salaQuery.data as { permiteCreacionProyectos: boolean }).permiteCreacionProyectos = true;
    proyectosSala.lista = [
      { id: 'p1', nombre: 'Propio', descripcion: null, esMiembro: true },
      { id: 'p2', nombre: 'Ajeno', descripcion: null, esMiembro: false },
    ];
    setup();
    expect(screen.getAllByText('Solo lectura')).toHaveLength(1);
    expect(screen.getByText('Ajeno').closest('article')).toHaveTextContent('Solo lectura');
    expect(screen.getByText('Propio').closest('article')).not.toHaveTextContent('Solo lectura');
  });
});

describe('accesos pendientes de revisión', () => {
  const pendiente = { id: 'r1', usuario: { id: 'u9', nombre: 'Eva Soto', email: 'eva@utem.cl' }, equipoNombre: 'Equipo Rojo', createdAt: '2026-11-20T12:00:00.000Z' };

  it('el docente ve quién salió de un equipo y decide mantener o quitar el acceso', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    equipos.pendientes = [pendiente];
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Equipos' }));
    expect(screen.getByRole('heading', { name: 'Accesos pendientes de revisión' })).toBeVisible();
    expect(screen.getByText(/salió de «Equipo Rojo»/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Mantener acceso de Eva Soto' }));
    expect(equipos.resolver).toHaveBeenCalledWith({ revisionId: 'r1', decision: 'MANTENER' });
    await userEvent.click(screen.getByRole('button', { name: 'Quitar acceso de Eva Soto' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(equipos.resolver).toHaveBeenCalledWith({ revisionId: 'r1', decision: 'QUITAR' }));
  });

  it('muestra las decisiones anteriores con quién las tomó', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    equipos.historial = [{ id: 'h1', usuario: { id: 'u9', nombre: 'Eva Soto', email: 'eva@utem.cl' }, equipoNombre: 'Equipo Rojo', decision: 'QUITADO', resueltoEn: '2026-11-21T12:00:00.000Z', resueltoPorNombre: 'Docente' }];
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Equipos' }));
    await userEvent.click(screen.getByText('Decisiones anteriores'));
    expect(screen.getByText(/Se quitó el acceso/)).toHaveTextContent('Eva Soto');
    expect(screen.getByText(/Se quitó el acceso/)).toHaveTextContent('por Docente');
  });

  it('sin pendientes no muestra el panel', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Equipos' }));
    expect(screen.queryByRole('heading', { name: 'Accesos pendientes de revisión' })).toBeNull();
  });
});

describe('el docente forma equipos pero no los elimina ni saca integrantes', () => {
  it('ve Agregar y Renombrar, sin Eliminar ni Quitar', async () => {
    salaDe('DOCENTE', 'u1', 'u1');
    equipos.lista = [{ id: 'eq1', nombre: 'Equipo Rojo', salaId: 's1', miembros: [{ equipoId: 'eq1', usuarioId: 'e1', usuario: { id: 'e1', nombre: 'Eva', email: 'eva@utem.cl' } }] }];
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Equipos' }));
    expect(screen.getByRole('button', { name: 'Renombrar' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull();
  });
  it('el docente tampoco ve la creación de proyectos en la sala', () => {
    salaDe('DOCENTE', 'u1', 'u1');
    setup();
    expect(screen.queryByRole('button', { name: /Crear proyecto|Nuevo proyecto/ })).toBeNull();
  });
});
