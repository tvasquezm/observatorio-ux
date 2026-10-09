import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useBlocker } from 'react-router-dom';
import { ProjectMenu } from './ProjectMenu';
import { agruparSecciones, SECCIONES_PROYECTO, type SeccionProyecto } from './project-sections';

function mount(extra: SeccionProyecto[] = [], currentTo = 'journey-map', compact = false, blockNavigation = false) {
  const items = [...SECCIONES_PROYECTO, ...extra];
  const current = items.find((item) => item.to === currentTo);
  function Menu() {
    useBlocker(blockNavigation);
    return <ProjectMenu groups={agruparSecciones(items)} current={current} currentLabel={current?.label ?? 'Resumen'} compact={compact} />;
  }
  const router = createMemoryRouter([{
    path: '/proyectos/:proyectoId',
    element: <Menu />,
    children: [{ path: '*', element: null }],
  }], { initialEntries: [`/proyectos/p1/${currentTo}`] });
  render(<RouterProvider router={router} />);
  return router;
}
const trigger = (name: RegExp) => screen.getByRole('button', { name });

describe('Menú de escritorio por grupos', () => {
  it.each([false, true])('conserva el menú si se bloquea la navegación (móvil: %s)', async (compact) => {
    const router = mount([], 'journey-map', compact, true);
    const opener = compact ? screen.getByText('Secciones del proyecto').closest('summary')! : trigger(/^Técnicas/);
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('link', { name: /Card Sorting/ }));
    expect(router.state.location.pathname).toBe('/proyectos/p1/journey-map');
    expect(screen.getByRole('link', { name: /Personas/ })).toBeVisible();
    if (compact) expect(opener.closest('details')).toHaveAttribute('open');
    else expect(opener).toHaveAttribute('aria-expanded', 'true');
  });

  it.each([false, true])('cierra y recupera el foco al elegir la sección actual (móvil: %s)', async (compact) => {
    mount([], 'journey-map', compact);
    const opener = compact ? screen.getByText('Secciones del proyecto').closest('summary')! : trigger(/^Técnicas/);
    await userEvent.click(opener);
    const link = screen.getByRole('link', { name: /Journey Map/ });
    link.focus();
    await userEvent.keyboard('{Enter}');
    if (compact) expect(opener.closest('details')).not.toHaveAttribute('open');
    else expect(opener).toHaveAttribute('aria-expanded', 'false');
    expect(opener).toHaveFocus();
  });

  it('muestra la sección actual y un botón por grupo con panel cerrado', () => {
    mount();
    expect(screen.getByRole('navigation', { name: 'Secciones del proyecto' })).toHaveTextContent('Journey Map');
    expect(trigger(/^Proyecto/)).toHaveAttribute('aria-expanded', 'false');
    expect(trigger(/^Técnicas/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /Personas/ })).not.toBeInTheDocument();
  });

  it('abre con clic, marca la sección actual con aria-current y avisa en qué grupo está', async () => {
    mount();
    expect(trigger(/^Técnicas/)).toHaveAccessibleName(/contiene la sección actual/);
    expect(trigger(/^Proyecto/)).not.toHaveAccessibleName(/contiene la sección actual/);
    await userEvent.click(trigger(/^Técnicas/));
    const panel = screen.getByRole('group', { name: 'Técnicas' });
    expect(trigger(/^Técnicas/)).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByRole('link', { name: /Journey Map/ })).toHaveAttribute('aria-current', 'page');
    expect(within(panel).getByRole('link', { name: /Personas/ })).not.toHaveAttribute('aria-current');
  });

  it('abre con teclado y Escape cierra devolviendo el foco al botón', async () => {
    mount();
    await userEvent.tab();
    expect(trigger(/^Proyecto/)).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(trigger(/^Proyecto/)).toHaveAttribute('aria-expanded', 'true');
    await userEvent.tab();
    expect(screen.getByRole('link', { name: /Resumen/ })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(trigger(/^Proyecto/)).toHaveAttribute('aria-expanded', 'false');
    expect(trigger(/^Proyecto/)).toHaveFocus();
  });

  it('mantiene un solo panel abierto a la vez', async () => {
    mount();
    await userEvent.click(trigger(/^Proyecto/));
    await userEvent.click(trigger(/^Técnicas/));
    expect(trigger(/^Proyecto/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('group')).toHaveLength(1);
    await userEvent.click(trigger(/^Técnicas/));
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('cierra al hacer clic fuera', async () => {
    mount();
    await userEvent.click(trigger(/^Técnicas/));
    await userEvent.click(document.body);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('navega y cierra el panel al elegir una sección', async () => {
    const router = mount();
    await userEvent.click(trigger(/^Técnicas/));
    await userEvent.click(screen.getByRole('link', { name: /Card Sorting/ }));
    expect(router.state.location.pathname).toBe('/proyectos/p1/card-sorting');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('un grupo nuevo crea su botón y su panel sin tocar el menú', async () => {
    mount([{ to: 'extra', label: 'Sección extra', group: 'Nuevo grupo', icon: 'resumen' }]);
    await userEvent.click(trigger(/^Nuevo grupo/));
    expect(within(screen.getByRole('group', { name: 'Nuevo grupo' })).getByRole('link', { name: /Sección extra/ })).toBeVisible();
  });
});
