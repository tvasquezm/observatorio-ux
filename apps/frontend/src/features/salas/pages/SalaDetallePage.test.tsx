import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SalaDetallePage } from './SalaDetallePage';
import { SalasApiError } from '../api/salas.api';
import { useAuthStore } from '../../auth/store/useAuthStore';

const salaQuery = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false, isError: true, error: null as Error | null, refetch: vi.fn() }));
const update = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useSalasQueries', () => ({
  useSala: () => salaQuery,
  useUpdateSala: () => ({ mutateAsync: update }),
  useProyectosDeSala: () => ({ data: [] }),
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
vi.mock('../../equipos/hooks/useEquiposQueries', () => ({
  useEquipos: () => ({ data: [] }),
  useCreateEquipo: () => ({ mutate: vi.fn() }),
  useUpdateEquipo: () => ({ mutate: vi.fn() }),
  useRemoveEquipo: () => ({ mutate: vi.fn() }),
  useAddMiembroEquipo: () => ({ mutate: vi.fn() }),
  useRemoveMiembroEquipo: () => ({ mutate: vi.fn() }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

beforeEach(() => {
  update.mockReset();
  salaQuery.data = undefined;
  salaQuery.isError = true;
  salaQuery.error = new SalasApiError(403, 'No estás asignado a esta sala. Pide a tu docente que registre el correo de tu cuenta.');
  useAuthStore.setState({ user: { id: 'u1', nombre: 'Ana', email: 'ana@utem.cl', rol: 'ESTUDIANTE' }, perspectiveRole: 'ESTUDIANTE' });
});

function setup() {
  return render(<RouterProvider router={createMemoryRouter([{ path: '/salas/:salaId', element: <SalaDetallePage /> }], { initialEntries: ['/salas/s1'] })} />);
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
    const responder = (event: Event) => {
      const detail = (event as CustomEvent<{ id: number; message: string }>).detail;
      pedidos.push(detail.message);
      window.dispatchEvent(new CustomEvent('app:confirm-response', { detail: { id: detail.id, result: true } }));
    };
    window.addEventListener('app:confirm', responder);
    try {
      setup();
      await userEvent.click(screen.getByRole('button', { name: 'Editar sala' }));
      fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Cambio sin guardar' } });
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(pedidos).toHaveLength(1);
      expect(pedidos[0]).toContain('cambios sin guardar');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      window.removeEventListener('app:confirm', responder);
    }
  });
});
