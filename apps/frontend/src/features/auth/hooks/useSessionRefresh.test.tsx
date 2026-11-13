import { act, renderHook, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSessionRefresh } from './useSessionRefresh';
import { useAuthStore } from '../store/useAuthStore';
import { evaluatorRequest } from '../../../shared/api/evaluator-client';
import { SessionExpiryDialog } from '../components/SessionExpiryDialog';
vi.mock('../../../shared/api/evaluator-client', () => ({ evaluatorRequest: vi.fn() }));
const request = vi.mocked(evaluatorRequest);
const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  request.mockReset();
  useAuthStore.setState({ isAuthenticated: true, expiresAt: Date.now() + 3600_000, sessionEnding: false, sessionNotice: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('renueva una vez por ventana tras actividad; no crea un bucle al cambiar expiresAt', async () => {
  request.mockImplementation(async () => ({ renewed: true, session: { expiresAt: Date.now() + 3600_000 } }));
  renderHook(useSessionRefresh, { wrapper });
  act(() => { window.dispatchEvent(new Event('pointerdown')); });
  await act(async () => { vi.advanceTimersByTime(3000_000); });
  expect(request).toHaveBeenCalledTimes(1);
  act(() => { window.dispatchEvent(new Event('keydown')); });
  expect(request).toHaveBeenCalledTimes(1);
});
it('sin actividad avisa a dos minutos y permite renovar manualmente', async () => {
  request.mockImplementation(async () => ({ renewed: true, session: { expiresAt: Date.now() + 3600_000 } }));
  const { result } = renderHook(useSessionRefresh, { wrapper });
  await act(async () => { vi.advanceTimersByTime(3480_000); });
  expect(request).not.toHaveBeenCalled(); expect(result.current.notice).toBe(true);
  await act(async () => { await result.current.refresh(); });
  expect(request).toHaveBeenCalledTimes(1); expect(result.current.notice).toBe(false);
});
it('si el servidor aún no permite renovar, espera su ventana y reutiliza la actividad pendiente', async () => {
  const expiresAt = Date.now() + 180_000;
  useAuthStore.setState({ expiresAt });
  request.mockResolvedValueOnce({ renewed: false, session: { expiresAt, refreshAt: expiresAt - 60_000 } });
  request.mockImplementationOnce(async () => ({ renewed: true, session: { expiresAt: Date.now() + 180_000 } }));
  renderHook(useSessionRefresh, { wrapper });
  await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(120_001); });
  expect(request).toHaveBeenCalledTimes(2);
});
it('429 espera actividad posterior al minuto; no hace polling', async () => {
  request.mockRejectedValue(Object.assign(new Error('Límite'), { status: 429 }));
  useAuthStore.setState({ expiresAt: Date.now() + 500_000 });
  renderHook(useSessionRefresh, { wrapper });
  await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(60_001); });
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { window.dispatchEvent(new Event('keydown')); });
  expect(request).toHaveBeenCalledTimes(2);
});
it('401 conserva la ruta y limpia la sesión sin borrar borradores', async () => {
  request.mockRejectedValue(Object.assign(new Error('Vencida'), { status: 401 }));
  useAuthStore.setState({ expiresAt: Date.now() + 500_000 });
  localStorage.setItem('observatorio-ux-draft:u1:project', 'borrador');
  renderHook(useSessionRefresh, { wrapper });
  await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
  expect(sessionStorage.getItem('observatorio-ux-returnTo')).toBe('/');
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(localStorage.getItem('observatorio-ux-draft:u1:project')).toBe('borrador');
});
it('permite cerrar el aviso y volver al formulario para guardar antes de vencer', async () => {
  useAuthStore.setState({ expiresAt: Date.now() + 120_000 });
  render(<MemoryRouter><input aria-label="Trabajo" autoFocus /><SessionExpiryDialog /></MemoryRouter>);
  await act(async () => { vi.advanceTimersByTime(1); });
  const dialog = screen.getByRole('alertdialog');
  expect(dialog).toHaveAttribute('open');
  fireEvent.click(screen.getByRole('button', { name: 'Volver a mi trabajo' }));
  expect(dialog).not.toHaveAttribute('open');
  expect(screen.getByLabelText('Trabajo')).toHaveFocus();
  expect(useAuthStore.getState().sessionNotice).toBe(false);
});
