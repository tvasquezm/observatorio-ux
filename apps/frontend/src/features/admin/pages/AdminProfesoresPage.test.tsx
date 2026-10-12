import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CrearDocenteForm } from './AdminProfesoresPage';

const create = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useUsersQueries', () => ({ useCreateDocente: () => ({ mutate: create, isPending: false }) }));
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
