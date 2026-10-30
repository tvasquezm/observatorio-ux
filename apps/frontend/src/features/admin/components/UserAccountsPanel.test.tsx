import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserAccountsPanel } from './UserAccountsPanel';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  updateRole: vi.fn(),
  currentUser: {
    id: 'admin-1',
    nombre: 'Admin Uno',
    email: 'admin@ux.cl',
    rol: 'ADMIN' as const,
  },
}));

vi.mock('../hooks/useUsersQueries', () => ({
  useAccounts: () => ({
    data: [
      { ...mocks.currentUser, createdAt: '2026-09-01T12:00:00.000Z' },
      {
        id: 'docente-1',
        nombre: 'Docente Uno',
        email: 'docente@ux.cl',
        rol: 'DOCENTE',
        createdAt: '2026-09-02T12:00:00.000Z',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateUserRole: () => ({ mutate: mocks.updateRole, isPending: false }),
}));

vi.mock('../../auth/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: typeof mocks.currentUser }) => unknown) =>
    selector({ user: mocks.currentUser }),
}));

vi.mock('../../../shared/api/confirm', () => ({ useConfirm: () => mocks.confirm }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirm.mockResolvedValue(true);
});

describe('UserAccountsPanel', () => {
  it('busca por nombre o correo y permite filtrar por rol', async () => {
    render(<UserAccountsPanel />);
    const search = screen.getByRole('searchbox', { name: 'Buscar cuentas' });
    await userEvent.type(search, 'docente@ux.cl');
    expect(screen.getByText('Docente Uno')).toBeVisible();
    expect(screen.queryByText('Admin Uno')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por rol'), 'ADMIN');
    expect(screen.getByText('No hay cuentas que coincidan con los filtros.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Admin Uno')).toBeVisible();
    expect(screen.getByText('Docente Uno')).toBeVisible();
  });

  it('protege la cuenta actual y permite cambiar el rol de otra cuenta', async () => {
    render(<UserAccountsPanel />);

    expect(screen.getByLabelText('Rol de Admin Uno')).toBeDisabled();
    const docenteRole = screen.getByLabelText('Rol de Docente Uno');
    await userEvent.selectOptions(docenteRole, 'ESTUDIANTE');

    expect(mocks.confirm).toHaveBeenCalledWith(
      '¿Cambiar el rol de "Docente Uno" a estudiante?',
    );
    expect(mocks.updateRole).toHaveBeenCalledWith({
      id: 'docente-1',
      rol: 'ESTUDIANTE',
    });
  });
});
