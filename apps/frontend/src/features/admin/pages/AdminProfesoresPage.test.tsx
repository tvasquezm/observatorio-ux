import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
  useSetCuentaActiva: () => ({ mutate: vi.fn(), isPending: false }),
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
  it('autoriza Google sin enviar ni inventar una contraseña', () => {
    create.mockImplementation((data, options) => options.onSuccess({ email: data.email }));
    render(<CrearDocenteForm />);
    fireEvent.click(screen.getByRole('radio', { name: 'Cuenta de Google' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } });
    fireEvent.change(screen.getByLabelText('Correo institucional'), { target: { value: 'ana@utem.cl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear docente' }));
    expect(create.mock.calls[0][0]).toEqual({ nombre: 'Ana Pérez', email: 'ana@utem.cl', acceso: 'GOOGLE' });
    expect(screen.getByRole('heading', { name: 'Cuenta autorizada para Google' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña creada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar correo' })).toBeEnabled();
  });
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

  it('genera una contraseña segura sin crear la cuenta ni borrar los datos', () => {
    render(<CrearDocenteForm />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Generar contraseña segura' }));
    expect((screen.getByLabelText('Contraseña temporal') as HTMLInputElement).value).toMatch(/^[a-f0-9]{32}$/);
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Pérez');
    expect(create).not.toHaveBeenCalled();
  });

  it('muestra el error junto al formulario y conserva los datos para reintentar', () => {
    create.mockImplementation((_data, options) => options.onError(new Error('Este correo ya tiene una cuenta.')));
    render(<CrearDocenteForm />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Crear docente' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Este correo ya tiene una cuenta.');
    expect(screen.getByLabelText('Correo institucional')).toHaveValue('ana@utem.cl');
  });
});

describe('eliminar docente', () => {
  it('exige escribir el nombre y no elimina si se cancela', async () => {
    estado.confirm.mockResolvedValue(false);
    render(<MemoryRouter><AdminProfesoresPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(estado.confirm).toHaveBeenCalledWith('¿Eliminar al docente "Ana Pérez"?', { requireText: 'Ana Pérez' });
    expect(estado.remove).not.toHaveBeenCalled();
  });

  it('elimina cuando la persona confirma', async () => {
    estado.confirm.mockResolvedValue(true);
    render(<MemoryRouter><AdminProfesoresPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(estado.remove).toHaveBeenCalledWith('d1');
  });
});
