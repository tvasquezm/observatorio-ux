import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from '../AppLayout';

const mocks = vi.hoisted(() => ({
  useProject: vi.fn(),
  user: { id: 'u1', nombre: 'Admin Uno', email: 'admin@test.com', rol: 'ADMIN' } as { id: string; nombre: string; email: string; rol: string },
}));

vi.mock('../../features/projects/hooks/useProjectsQueries', () => ({ useProject: mocks.useProject }));

vi.mock('../../features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({
    user: mocks.user,
    perspectiveRole: mocks.user.rol,
    setPerspective: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="*" element={<p>Contenido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return within(screen.getByRole('navigation', { name: 'Ruta de navegación' }));
}

beforeEach(() => {
  mocks.user.rol = 'ADMIN';
  window.localStorage.setItem('observatorio-ux-theme', 'light');
  mocks.useProject.mockReturnValue({ data: { id: 'p1', nombre: 'Proyecto Uno' } });
});

describe('AppLayout · breadcrumb y título', () => {
  it('en el Dashboard marca la página actual y fija el título', () => {
    const crumb = renderAt('/');
    expect(crumb.getByText('Dashboard')).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Dashboard · Observatorio UX');
  });

  it('en una sección de proyecto muestra el nombre real del proyecto con enlace y la sección actual', () => {
    const crumb = renderAt('/proyectos/p1/personas');
    expect(crumb.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '/proyectos');
    expect(crumb.getByRole('link', { name: 'Proyecto Uno' })).toHaveAttribute('href', '/proyectos/p1');
    expect(crumb.getByText('Personas')).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Personas · Proyecto Uno · Proyectos · Observatorio UX');
  });

  it('en el resumen del proyecto el proyecto es la página actual', () => {
    const crumb = renderAt('/proyectos/p1');
    expect(crumb.getByText('Proyecto Uno')).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Proyecto Uno · Proyectos · Observatorio UX');
  });

  it('en una subruta de admin enlaza al padre', () => {
    const crumb = renderAt('/admin/profesores');
    expect(crumb.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/admin');
    expect(crumb.getByText('Profesores')).toHaveAttribute('aria-current', 'page');
  });
});

describe('AppLayout · selector de perspectiva', () => {
  it('lo ven el administrador y el docente', () => {
    for (const rol of ['ADMIN', 'DOCENTE']) {
      mocks.user.rol = rol;
      const { unmount } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes><Route element={<AppLayout />}><Route path="*" element={<p>Contenido</p>} /></Route></Routes>
        </MemoryRouter>,
      );
      expect(screen.getByRole('group', { name: 'Cambiar perspectiva' })).toBeTruthy();
      unmount();
    }
  });

  it('el estudiante no lo ve', () => {
    mocks.user.rol = 'ESTUDIANTE';
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route element={<AppLayout />}><Route path="*" element={<p>Contenido</p>} /></Route></Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('group', { name: 'Cambiar perspectiva' })).toBeNull();
    expect(screen.queryByText(/Viendo como/)).toBeNull();
  });
});
