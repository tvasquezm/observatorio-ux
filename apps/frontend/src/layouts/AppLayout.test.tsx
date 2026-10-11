import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

const auth = vi.hoisted(() => ({ role: null as string | null }));
vi.mock('../features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({
    user: auth.role ? { id: 'u1', nombre: 'Ana Pérez', rol: auth.role } : null,
    perspectiveRole: auth.role,
    setPerspective: vi.fn(),
    logout: vi.fn(),
  }),
}));
beforeEach(() => {
  auth.role = null;
  localStorage.clear();
  delete document.documentElement.dataset.contrast;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
});
describe('Preferencia de contraste', () => {
  it.each([['/salas/sala-1', 'Detalle de sala'], ['/salas/eliminadas', 'Salas eliminadas']])('identifica la ruta %s', (path, title) => {
    render(<MemoryRouter initialEntries={[path]}><AppLayout /></MemoryRouter>);
    expect(document.title).toBe(`${title} · Observatorio UX`);
    expect(screen.getByRole('navigation', { name: 'Ubicación general' })).toHaveTextContent(title);
  });
  it('activa alto contraste, lo conserva al volver y permite restaurar contraste normal', () => {
    const mount = () => render(<MemoryRouter><AppLayout /></MemoryRouter>);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Preferencias' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alto contraste' }));
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(localStorage.getItem('observatorio-ux-contrast')).toBe('high');
    cleanup();
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Preferencias' }));
    const toggle = screen.getByRole('button', { name: 'Alto contraste' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.contrast).toBe('normal');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('conserva el contraste elegido al cambiar entre modo claro y oscuro', () => {
    localStorage.setItem('observatorio-ux-contrast', 'high');
    render(<MemoryRouter><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Preferencias' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.contrast).toBe('high');
  });
});

describe('Selector "Viendo como"', () => {
  it.each([['DOCENTE', true], ['ADMIN', true], ['ESTUDIANTE', false]])('rol %s: visible=%s', (role, visible) => {
    auth.role = role;
    render(<MemoryRouter><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Preferencias' }));
    const status = screen.queryByText(/Viendo como/);
    expect(!!status).toBe(visible);
    expect(!!screen.queryByRole('group', { name: 'Cambiar perspectiva' })).toBe(visible);
  });
  it('abre preferencias en un diálogo y permite cerrarlo', () => {
    render(<MemoryRouter><AppLayout /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preferencias' }));
    expect(screen.getByRole('dialog', { name: 'Preferencias' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar preferencias' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Barra lateral', () => {
  it('permite minimizar y expandir con teclado, conservando los accesos', async () => {
    auth.role = 'ADMIN';
    render(<MemoryRouter><AppLayout /></MemoryRouter>);
    await waitFor(() => expect(document.getElementById('main-content')).toHaveFocus());
    const toggle = screen.getByRole('button', { name: 'Minimizar barra lateral' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Expandir barra lateral' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('complementary', { name: 'Navegación principal' }).parentElement).toHaveClass('side-collapsed');
    expect(screen.getByRole('link', { name: 'Salas' })).toHaveAttribute('href', '/salas');
    expect(screen.getByRole('button', { name: 'Salir' })).toBeEnabled();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Minimizar barra lateral' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('complementary', { name: 'Navegación principal' }).parentElement).not.toHaveClass('side-collapsed');
  });

  it('conserva las restricciones de acceso al minimizar', () => {
    auth.role = 'ESTUDIANTE';
    render(<MemoryRouter><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Minimizar barra lateral' }));
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Salas' })).toHaveAttribute('href', '/salas');
    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '/proyectos');
  });
});
