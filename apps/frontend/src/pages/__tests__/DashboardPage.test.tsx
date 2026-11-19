import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import userEvent from '@testing-library/user-event';
import { TECNICAS_INFO } from '../../shared/content/tecnicas-info';

const mocks = vi.hoisted(() => ({
  useProjects: vi.fn(),
  useSalas: vi.fn(),
  auth: { user: { id: 'u1', nombre: 'Administración', email: 'admin@test.com', rol: 'ADMIN' as string } },
}));

vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({
  useProjects: mocks.useProjects,
}));

vi.mock('../../features/salas/hooks/useSalasQueries', () => ({
  useSalas: mocks.useSalas,
}));

vi.mock('../../features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({ user: mocks.auth.user }),
}));

const proyecto = {
  id: 'p1',
  nombre: 'Proyecto Uno',
  descripcion: 'Primera investigación',
  creadoPorId: 'u1',
  createdAt: '2026-09-08T12:00:00.000Z',
  _count: { sesiones: 2, artefactos: 4 },
};

beforeEach(() => {
  sessionStorage.clear();
  mocks.auth.user = { id: 'u1', nombre: 'Administración', email: 'admin@test.com', rol: 'ADMIN' };
  mocks.useProjects.mockReturnValue({
    isLoading: false,
    data: [
      proyecto,
      { ...proyecto, id: 'p2', nombre: 'Proyecto Dos', descripcion: null, createdAt: '2026-09-08T13:00:00.000Z', _count: { sesiones: 3, artefactos: 1 } },
    ],
  });
  mocks.useSalas.mockReturnValue({ isLoading: false, data: [] });
});

function montar() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe('Inicio en dos pasos', () => {
  it('invita a crear el primer proyecto cuando no hay ninguno', () => {
    mocks.useProjects.mockReturnValue({ isLoading: false, data: [] });
    montar();
    expect(screen.getByText('Todavía no tienes proyectos.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear tu primer proyecto' })).toHaveAttribute('href', '/proyectos');
    expect(screen.getByRole('heading', { name: 'Proyecto' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Técnica' })).toBeInTheDocument();
  });

  it('con un proyecto elegido, las cinco técnicas abren dentro de él y existe el enlace a todos los proyectos', async () => {
    mocks.useProjects.mockReturnValue({ isLoading: false, data: [proyecto] });
    montar();
    expect(screen.getByLabelText('Proyecto activo')).toHaveValue('p1');
    const tecnicas = screen.getByRole('region', { name: 'Técnica' });
    const tarjetas = within(tecnicas).getAllByRole('link');
    expect(tarjetas).toHaveLength(5);
    for (const tecnica of Object.keys(TECNICAS_INFO)) {
      expect(screen.getByRole('link', { name: new RegExp(`^${nombreTecnica(tecnica)}`) })).toHaveAttribute('href', `/proyectos/p1/${tecnica}`);
    }
    expect(screen.getByRole('link', { name: 'Todos los proyectos' })).toHaveAttribute('href', '/proyectos');
  });

  it('conserva el proyecto elegido al volver a Inicio y lo limpia si deja de estar disponible', async () => {
    const primero = montar();
    await userEvent.selectOptions(screen.getByLabelText('Proyecto activo'), 'p2');
    expect(screen.getByRole('link', { name: /^Personas/ })).toHaveAttribute('href', '/proyectos/p2/personas');
    primero.unmount();
    montar();
    expect(screen.getByLabelText('Proyecto activo')).toHaveValue('p2');
  });

  it('pide elegir un proyecto cuando hay varios y ninguno está seleccionado', () => {
    sessionStorage.setItem('observatorio-ux-project:u1', 'removed');
    montar();
    expect(screen.getByLabelText('Proyecto activo')).toHaveValue('');
    expect(screen.getByText('Selecciona un proyecto para abrir sus técnicas.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Personas/ })).toHaveAttribute('href', '/proyectos');
  });

  it('ya no muestra métricas, recientes, mensajes repetidos ni el panel de jerarquía', () => {
    montar();
    for (const texto of [
      'Trabajando en',
      'Continuar en',
      'Proyectos creados recientemente',
      'Cada técnica alimenta la misma decisión',
      'Perspectiva activa',
      'Proyecto seleccionado',
      'Sala → Proyecto → Técnica',
      'Ver proyectos',
      'Tu investigación, en vistas conectadas',
      'MÉTODOS DISPONIBLES',
    ]) {
      expect(screen.queryByText(texto, { exact: false })).toBeNull();
    }
  });

  it('muestra las salas solo al estudiante', () => {
    mocks.useSalas.mockReturnValue({ isLoading: false, data: [{ id: 's1', nombre: 'Sala de prueba', periodo: '2026-2', profesor: { nombre: 'Docente' } }] });
    mocks.auth.user = { id: 'e1', nombre: 'Estudiante', email: 'e@test.com', rol: 'ESTUDIANTE' };
    const primero = montar();
    expect(screen.getByText('Salas en las que estás inscrito')).toBeInTheDocument();
    expect(screen.getByText('Sala de prueba')).toBeInTheDocument();
    primero.unmount();
    mocks.auth.user = { id: 'u1', nombre: 'Administración', email: 'admin@test.com', rol: 'ADMIN' };
    montar();
    expect(screen.queryByText('Salas en las que estás inscrito')).toBeNull();
  });
});

function nombreTecnica(id: string) {
  return { personas: 'Personas', 'journey-map': 'Journey Map', 'momentos-criticos': 'Momentos críticos', 'card-sorting': 'Card Sorting', 'evaluacion-heuristica': 'Evaluación heurística' }[id] ?? id;
}
