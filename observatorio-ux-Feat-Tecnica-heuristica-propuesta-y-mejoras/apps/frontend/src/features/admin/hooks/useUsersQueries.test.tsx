import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocente, getAccounts, removeDocente } from '../api/users.api';
import { useCreateDocente, useRemoveDocente, usersKeys } from './useUsersQueries';

vi.mock('../api/users.api', () => ({
  getAccounts: vi.fn(),
  getDocentes: vi.fn(),
  getEstudiantes: vi.fn(),
  createDocente: vi.fn(),
  removeDocente: vi.fn(),
  updateUserRole: vi.fn(),
  UsersApiError: class extends Error {},
}));
vi.mock('../../../shared/api/toast', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

const docente = {
  id: 'docente-1',
  nombre: 'Docente Uno',
  email: 'docente@ux.cl',
  rol: 'DOCENTE' as const,
  createdAt: '2026-09-01T12:00:00.000Z',
};

describe('catálogo de cuentas', () => {
  it.each(['crear', 'eliminar'] as const)(
    'actualiza las cuentas frescas después de %s un docente',
    async (operacion) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 60_000, retry: false } },
      });
      qc.setQueryData(usersKeys.accounts, operacion === 'crear' ? [] : [docente]);
      const actualizadas = operacion === 'crear' ? [docente] : [];
      vi.mocked(getAccounts).mockResolvedValue(actualizadas);
      vi.mocked(createDocente).mockResolvedValue(docente);
      vi.mocked(removeDocente).mockResolvedValue({ eliminado: true });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );
      const { result, unmount } = renderHook(() => ({
        crear: useCreateDocente(),
        eliminar: useRemoveDocente(),
      }), { wrapper });

      await act(async () => {
        if (operacion === 'crear') {
          await result.current.crear.mutateAsync({
            nombre: docente.nombre, email: docente.email, password: 'password-seguro',
          });
        } else {
          await result.current.eliminar.mutateAsync(docente.id);
        }
      });

      const cuentas = await qc.fetchQuery({ queryKey: usersKeys.accounts, queryFn: getAccounts });
      expect(cuentas).toEqual(actualizadas);
      expect(getAccounts).toHaveBeenCalledTimes(1);
      unmount();
      qc.clear();
    },
  );
});
