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

vi.mock('../../features/analitica-proyecto/PanelContinuar', () => ({ PanelContinuar: () => null }));
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
  localStorage.clear();
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
    expect(screen.getByRole('combobox', { name: 'Proyecto activo' })).toHaveValue('Proyecto Uno');
    const tecnicas = screen.getByRole('region', { name: 'Técnica' });
    const tarjetas = within(tecnicas).getAllByRole('link');
    expect(tarjetas).toHaveLength(5);
    for (const [tecnica, info] of Object.entries(TECNICAS_INFO)) {
      const link = within(tecnicas).getByRole('link', { name: new RegExp(`^${nombreTecnica(tecnica)}`) });
      expect(link).toHaveAttribute('href', `/proyectos/p1/${tecnica}`);
      expect(link.querySelector('.tech-glyph svg')).toHaveAttribute('aria-hidden', 'true');
      expect(link.querySelector('.tech-glyph')?.textContent).toBe('');
      expect(info.descripcionCorta.trim()).not.toBe('');
      expect(within(link).getByText(info.descripcionCorta)).toBeVisible();
    }
    expect(screen.getByRole('link', { name: 'Todos los proyectos' })).toHaveAttribute('href', '/proyectos');
  });

  it('conserva el proyecto elegido al volver a Inicio y lo limpia si deja de estar disponible', async () => {
    const primero = montar();
    await userEvent.click(screen.getByRole('combobox', { name: 'Proyecto activo' }));
    await userEvent.click(screen.getByRole('option', { name: /^Proyecto Dos/ }));
    expect(screen.getByRole('link', { name: /^Personas/ })).toHaveAttribute('href', '/proyectos/p2/personas');
    primero.unmount();
    montar();
    expect(screen.getByRole('combobox', { name: 'Proyecto activo' })).toHaveValue('Proyecto Dos');
  });

  it('pide elegir un proyecto cuando hay varios y ninguno está seleccionado', () => {
    sessionStorage.setItem('observatorio-ux-project:u1', 'removed');
    montar();
    expect(screen.getByRole('combobox', { name: 'Proyecto activo' })).toHaveValue('');
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
      'Ver explicación completa',
      'Descargar explicación',
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

describe('Filtro por sala', () => {
  it('no aparece si todos los proyectos están en la misma sala', () => {
    montar();
    expect(screen.queryByRole('combobox', { name: 'Sala' })).not.toBeInTheDocument();
  });

  it('filtra por sala con el selector de salas y agrupa los proyectos', async () => {
    mocks.useSalas.mockReturnValue({ isLoading: false, data: [{ id: 's1', nombre: 'Taller UX A', periodo: '2026-2' }, { id: 's2', nombre: 'Taller UX B', periodo: '2026-2' }] });
    mocks.useProjects.mockReturnValue({ isLoading: false, data: [
      { ...proyecto, salaId: 's1' },
      { ...proyecto, id: 'p2', nombre: 'Proyecto Dos', salaId: 's2' },
      { ...proyecto, id: 'p3', nombre: 'Proyecto Tres', salaId: null },
    ] });
    montar();
    const sala = screen.getByRole('combobox', { name: 'Sala' });
    expect(within(sala).getAllByRole('option').map(o => o.textContent)).toEqual(['Todas las salas (3)', 'Taller UX A (1)', 'Taller UX B (1)', 'Sin sala (1)']);
    await userEvent.click(screen.getByRole('combobox', { name: 'Proyecto activo' }));
    const nombres = () => within(screen.getByRole('listbox', { name: 'Proyectos' })).getAllByRole('option').map(o => o.querySelector('.selector-nombre')?.textContent);
    expect(nombres()).toEqual(['Proyecto Uno', 'Proyecto Dos', 'Proyecto Tres']);
    await userEvent.selectOptions(sala, 's2');
    await userEvent.click(screen.getByRole('combobox', { name: 'Proyecto activo' }));
    expect(nombres()).toEqual(['Proyecto Dos']);
  });

  it('con muchos proyectos se busca por nombre y se elige con el teclado; los últimos usados salen primero', async () => {
    mocks.useProjects.mockReturnValue({ isLoading: false, data: Array.from({ length: 25 }, (_, i) => ({ ...proyecto, id: 'p' + i, nombre: i === 17 ? 'Banco digital' : 'Proyecto ' + String(i).padStart(2, '0') })) });
    montar();
    const caja = screen.getByRole('combobox', { name: 'Proyecto activo' });
    await userEvent.click(caja);
    expect(screen.getAllByRole('option')).toHaveLength(25);
    await userEvent.type(caja, 'banco');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{Enter}');
    expect(caja).toHaveValue('Banco digital');
    expect(screen.getByRole('link', { name: /^Personas/ })).toHaveAttribute('href', '/proyectos/p17/personas');
    await userEvent.click(caja);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Banco digital');
    expect(screen.getByText('Recientes')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
