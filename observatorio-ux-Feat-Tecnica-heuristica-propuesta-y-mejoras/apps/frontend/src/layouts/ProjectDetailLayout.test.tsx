import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ProjectDetailLayout } from './ProjectDetailLayout';

const state = vi.hoisted(() => ({ role: 'ADMIN', owner: 'reviewer' }));
vi.mock('../features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'reviewer', rol: state.role }, perspectiveRole: state.role }),
}));
vi.mock('../features/projects/hooks/useProjectsQueries', () => ({
  useProject: () => ({ data: { nombre: 'Proyecto UX', creadoPorId: state.owner } }),
}));
function mount(section = 'card-sorting/study/resultados') {
  const router = createMemoryRouter([{
    path: '/proyectos/:proyectoId', element: <ProjectDetailLayout />,
    children: [{ path: '*', element: <p>Contenido del proyecto</p> }],
  }], { initialEntries: [`/proyectos/p1/${section}`] });
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(() => { vi.unstubAllGlobals(); state.role = 'ADMIN'; state.owner = 'reviewer'; });

describe('Menú de secciones del proyecto', () => {
  it.each([true, false])('en el resumen evita duplicar las tarjetas de técnicas (compacto=%s)', async (compact) => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: compact, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    mount('');
    await userEvent.click(compact
      ? screen.getByText('Secciones del proyecto').closest('summary')!
      : screen.getByRole('button', { name: /^Proyecto/ }));
    expect(screen.getByRole('link', { name: 'Miembros' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Técnicas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Card Sorting' })).not.toBeInTheDocument();
  });
  it('permite abrir con teclado y cerrar con Escape devolviendo el foco', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Proyecto UX' })).toHaveFocus());
    const summary = screen.getByText('Secciones del proyecto').closest('summary')!;
    await userEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Resumen' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(summary).toHaveFocus();
  });
  it('muestra la técnica actual y abre todas las secciones sin desplazamiento lateral', async () => {
    mount();
    const summary = screen.getByText('Secciones del proyecto').closest('summary')!;
    expect(within(summary).getByText('Card Sorting')).toBeInTheDocument();
    expect(summary.closest('details')).not.toHaveAttribute('open');
    await userEvent.click(summary);
    const nav = screen.getByRole('navigation', { name: 'Secciones del proyecto' });
    for (const name of ['Resumen', 'Personas', 'Journey Map', 'Momentos críticos',
      'Card Sorting', 'Evaluación heurística', 'Comentarios', 'Analítica', 'Miembros', 'Participantes']) {
      expect(within(nav).getByRole('link', { name })).toBeVisible();
    }
  });

  it('agrupa los enlaces por bloque con título propio', async () => {
    mount();
    await userEvent.click(screen.getByText('Secciones del proyecto').closest('summary')!);
    const proyecto = screen.getByRole('region', { name: 'Proyecto' });
    const tecnicas = screen.getByRole('region', { name: 'Técnicas' });
    expect(within(proyecto).getByRole('link', { name: 'Miembros' })).toBeVisible();
    expect(within(tecnicas).getByRole('link', { name: 'Momentos críticos' })).toBeVisible();
    expect(within(tecnicas).queryByRole('link', { name: 'Miembros' })).not.toBeInTheDocument();
  });

  it('navega desde una ruta de resultados y cierra el menú al elegir una sección', async () => {
    const router = mount();
    const summary = screen.getByText('Secciones del proyecto').closest('summary')!;
    await userEvent.click(summary);
    await userEvent.click(screen.getByRole('link', { name: 'Journey Map' }));
    expect(router.state.location.pathname).toBe('/proyectos/p1/journey-map');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(within(summary).getByText('Journey Map')).toBeInTheDocument();
  });
  it('identifica la pantalla con un título y una ruta de navegación', () => {
    mount('journey-map');
    expect(document.title).toBe('Journey Map · Proyecto UX · Observatorio UX');
    const crumbs = screen.getByRole('navigation', { name: 'Ubicación del proyecto' });
    expect(within(crumbs).getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '/proyectos');
    expect(within(crumbs).getByRole('link', { name: 'Proyecto UX' })).toHaveAttribute('href', '/proyectos/p1');
    expect(within(crumbs).getByText('Journey Map')).toHaveAttribute('aria-current', 'page');
  });

  it('mantiene las restricciones de analítica y participantes para un estudiante que no es dueño', async () => {
    state.role = 'ESTUDIANTE'; state.owner = 'another-user';
    mount('card-sorting');
    await userEvent.click(screen.getByText('Secciones del proyecto').closest('summary')!);
    expect(screen.queryByRole('link', { name: 'Analítica' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Participantes' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Card Sorting' })).toBeVisible();
  });
});
