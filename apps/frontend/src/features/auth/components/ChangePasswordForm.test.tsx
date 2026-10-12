import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from './ChangePasswordForm';

const change = vi.hoisted(() => vi.fn());
vi.mock('../api/auth.api', () => ({ changePassword: change }));
beforeEach(() => vi.resetAllMocks());

function fill(confirmation = 'nueva-1234') {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'actual-1234' } });
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'nueva-1234' } });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: confirmation } });
}

describe('cambiar contraseña', () => {
  it('verifica la confirmación antes de enviar', async () => {
    render(<ChangePasswordForm />); fill('otra-1234');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no coinciden');
    expect(change).not.toHaveBeenCalled();
  });
  it('limpia los campos después del éxito y mantiene visible el control de contraseña', async () => {
    change.mockResolvedValue({ ok: true });
    render(<ChangePasswordForm />); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    await waitFor(() => expect(change).toHaveBeenCalledWith('actual-1234', 'nueva-1234'));
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada');
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Mostrar contraseñas' })).toBeEnabled();
  });
  it('muestra el error y permite reintentar sin perder el formulario', async () => {
    change.mockRejectedValue(new Error('La contraseña actual es incorrecta.'));
    render(<ChangePasswordForm />); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('actual es incorrecta');
    expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('nueva-1234');
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeEnabled();
  });
});
