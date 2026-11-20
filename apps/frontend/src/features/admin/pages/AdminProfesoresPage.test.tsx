import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProfesoresPage, CrearDocenteForm } from './AdminProfesoresPage';

const create = vi.hoisted(() => vi.fn());
const estado = vi.hoisted(() => ({ remove: vi.fn(), confirm: vi.fn() }));
vi.mock('../hooks/useUsersQueries', () => ({
  useCreateDocente: () => ({ mutate: create, isPending: false }),
  useDocentes: () => ({ data: [{ id: 'd1', nombre: 'Ana Pérez', email: 'ana@utem.cl', createdAt: '2026-01-05T12:00:00.000Z' }], isLoading: false, isError: false, refetch: vi.fn() }),
  useEstudiantesAdmin: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useRemoveDocente: () => ({ mutate: estado.remove, isPending: false }),
  useAccounts: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useUpdateUserRole: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../projects/hooks/useProjectsQueries', () => ({
  useAdminProjectOverview: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateProject: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../shared/api/confirm', () => ({ useConfirm: () => estado.confirm }));
beforeEach(() => vi.resetAllMocks());

function fill() {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Correo institucional'), { target: { value: 'ana@utem.cl' } });
  fireEvent.change(screen.getByLabelText('Contraseña temporal'), { target: { value: 'temporal1234' } });
}

describe('crear docente', () => {
  it('siempre ofrece mostrar/ocultar y conserva las credenciales solo después del éxito', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    create.mockImplementation((data, options) => options.onSuccess({ email: data.email }));
    render(<CrearDocenteForm />);
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeEnabled();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña temporal')).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Crear docente' }));
    expect(screen.getByLabelText('Contraseña temporal')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Copiar correo y contraseña' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Correo: ana@utem.cl\nContraseña temporal: temporal1234'));
    expect(screen.getByRole('status')).toHaveTextContent('Credenciales copiadas');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar credenciales' }));
    expect(screen.queryByRole('button', { name: 'Copiar correo y contraseña' })).toBeNull();
  });

  it('un error al crear conserva el formulario y no ofrece compartir un acceso inexistente', () => {
    render(<CrearDocenteForm />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Crear docente' }));
    expect(screen.getByLabelText('Contraseña temporal')).toHaveValue('temporal1234');
    expect(screen.queryByRole('button', { name: 'Copiar correo y contraseña' })).toBeNull();
  });

  it('informa si el navegador bloquea la copia', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) } });
    create.mockImplementation((data, options) => options.onSuccess({ email: data.email }));
    render(<CrearDocenteForm />); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Crear docente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar correo y contraseña' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No se pudieron copiar');
  });
});

describe('eliminar docente', () => {
  it('exige escribir el nombre y no elimina si se cancela', async () => {
    estado.confirm.mockResolvedValue(false);
    render(<AdminProfesoresPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(estado.confirm).toHaveBeenCalledWith('¿Eliminar al docente "Ana Pérez"?', { requireText: 'Ana Pérez' });
    expect(estado.remove).not.toHaveBeenCalled();
  });

  it('elimina cuando la persona confirma', async () => {
    estado.confirm.mockResolvedValue(true);
    render(<AdminProfesoresPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(estado.remove).toHaveBeenCalledWith('d1');
  });
});
