import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import userEvent from '@testing-library/user-event';

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
  sessionStorage.clear();
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
  it('exige elegir entre varios proyectos y conserva el contexto seleccionado', async () => {
    const mount = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const first = mount();
    expect(screen.getByRole('link', { name: /Personas Necesidades/ })).toHaveAttribute('href', '/proyectos');
    await userEvent.selectOptions(screen.getByLabelText('Proyecto activo'), 'p2');
    expect(screen.getByRole('link', { name: /Personas Necesidades/ })).toHaveAttribute('href', '/proyectos/p2/personas');
    first.unmount();
    mount();
    expect(screen.getByLabelText('Proyecto activo')).toHaveValue('p2');
    expect(screen.getByRole('link', { name: /Personas Necesidades/ })).toHaveAttribute('href', '/proyectos/p2/personas');
  });
  it('solicita una nueva elección si el proyecto guardado deja de estar disponible', () => {
    sessionStorage.setItem('observatorio-ux-project:u1', 'removed');
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByLabelText('Proyecto activo')).toHaveValue('');
    expect(screen.getByRole('link', { name: /Personas Necesidades/ })).toHaveAttribute('href', '/proyectos');
  });
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
