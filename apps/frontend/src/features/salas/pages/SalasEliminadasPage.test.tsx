import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SalasEliminadasPage } from './SalasEliminadasPage';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { useAuthStore } from '../../auth/store/useAuthStore';

const salas = vi.hoisted(() => ({
  isLoading: false,
  data: [{ id: 's1', nombre: 'Sala Demo 2026', periodo: '2026-2', deletedAt: new Date().toISOString() }],
}));
const hard = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useSalasQueries', () => ({
  useSalasEliminadas: () => salas,
  useRestoreSala: () => ({ mutate: vi.fn() }),
  useHardDeleteSala: () => ({ mutate: hard }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

beforeEach(() => {
  hard.mockReset();
  useAuthStore.setState({ user: { id: 'admin-1', nombre: 'Admin', email: 'admin@ux.cl', rol: 'ADMIN' }, perspectiveRole: 'ADMIN' });
});

function montar() {
  render(<MemoryRouter><SalasEliminadasPage /><ConfirmDialog /></MemoryRouter>);
}

describe('borrado definitivo de una sala', () => {
  it('no llama a la API hasta escribir el nombre de la sala', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar definitivo' }));
    expect(screen.getByText(/borra "Sala Demo 2026" de forma DEFINITIVA/)).toBeVisible();
    const campo = screen.getByLabelText('Escribe «Sala Demo 2026» para confirmar');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    await userEvent.type(campo, 'Sala Demo');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(hard).not.toHaveBeenCalled();
    await userEvent.type(campo, ' 2026');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(hard).toHaveBeenCalledWith({ salaId: 's1', nombre: 'Sala Demo 2026' }));
  });

  it('solo el administrador ve el borrado definitivo', () => {
    useAuthStore.setState({ user: { id: 'doc-1', nombre: 'Docente', email: 'doc@ux.cl', rol: 'DOCENTE' }, perspectiveRole: 'DOCENTE' });
    montar();
    expect(screen.queryByRole('button', { name: 'Eliminar definitivo' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Recuperar' })).toBeVisible();
  });
});
