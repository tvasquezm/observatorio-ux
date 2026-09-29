import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';

const mocks = vi.hoisted(() => ({
  useProjects: vi.fn(),
  useSalas: vi.fn(),
}));

vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({
  useProjects: mocks.useProjects,
}));

vi.mock('../../features/salas/hooks/useSalasQueries', () => ({
  useSalas: mocks.useSalas,
}));

vi.mock('../../features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { id: 'u1', nombre: 'Administración', email: 'admin@test.com', rol: 'ADMIN' },
    perspectiveRole: 'ADMIN',
  }),
}));

beforeEach(() => {
  mocks.useProjects.mockReturnValue({
    isLoading: false,
    data: [
      {
        id: 'p1',
        nombre: 'Proyecto Uno',
        descripcion: 'Primera investigación',
        creadoPorId: 'u1',
        createdAt: '2026-09-08T12:00:00.000Z',
        _count: { sesiones: 2, artefactos: 4 },
      },
      {
        id: 'p2',
        nombre: 'Proyecto Dos',
        descripcion: null,
        creadoPorId: 'u1',
        createdAt: '2026-09-08T13:00:00.000Z',
        _count: { sesiones: 3, artefactos: 1 },
      },
    ],
  });
  mocks.useSalas.mockReturnValue({ isLoading: false, data: [] });
});

describe('DashboardPage', () => {
  it('resume las sesiones reales informadas por los proyectos', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    const metricaSesiones = screen.getByText('Sesiones').closest('article');
    expect(metricaSesiones).not.toBeNull();
    expect(within(metricaSesiones!).getByText('05')).toBeInTheDocument();
    expect(screen.getByText('2 sesiones registradas')).toBeInTheDocument();
    expect(screen.getByText('3 sesiones registradas')).toBeInTheDocument();
  });
});
