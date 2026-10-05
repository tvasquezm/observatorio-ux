import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

vi.mock('../features/auth/store/useAuthStore', () => ({
  useAuthStore: () => ({ user: null, perspectiveRole: null, setPerspective: vi.fn(), logout: vi.fn() }),
}));
beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.contrast;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
});
describe('Preferencia de contraste', () => {
  it('activa alto contraste, lo conserva al volver y permite restaurar contraste normal', () => {
    const mount = () => render(<MemoryRouter><AppLayout /></MemoryRouter>);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Alto contraste' }));
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(localStorage.getItem('observatorio-ux-contrast')).toBe('high');
    cleanup();
    mount();
    const toggle = screen.getByRole('button', { name: 'Alto contraste' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.contrast).toBe('normal');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('conserva el contraste elegido al cambiar entre modo claro y oscuro', () => {
    localStorage.setItem('observatorio-ux-contrast', 'high');
    render(<MemoryRouter><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.contrast).toBe('high');
  });
});
